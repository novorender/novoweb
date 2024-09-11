import { LoadingButton } from "@mui/lab";
import { CircularProgress, CssBaseline, Paper, Snackbar, snackbarContentClasses } from "@mui/material";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import enLocale from "date-fns/locale/en-GB";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { generatePath, Redirect, Route, Switch, useHistory, useLocation, useParams } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";

import { dataApi } from "apis/dataV1";
import { Loading } from "components";
import { StorageKey } from "config/storage";
import { Explorer } from "pages/explorer";
import { authActions, User } from "slices/authSlice";
import { explorerActions, selectConfig } from "slices/explorer";
import { getOAuthState, getUser } from "utils/auth";
import { initMixpanel, mixpanel } from "utils/mixpanel";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";

import { useAppDispatch, useAppSelector } from "./redux-store-interactions";
import { theme } from "./theme";

enum Status {
    Initial,
    Loading,
    Ready,
}

export function App() {
    const history = useHistory();
    const [authStatus, setAuthStatus] = useState(Status.Initial);
    const [configStatus, setConfigStatus] = useState(Status.Initial);
    const config = useAppSelector(selectConfig);
    const dispatch = useAppDispatch();
    const useTokenFromUrl = window.top !== self && new URLSearchParams(window.location.search).get("accessToken");

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        immediate: false,
    });

    useEffect(() => {
        initConfig();

        let timeOutId = 0;
        async function initConfig() {
            if (configStatus !== Status.Initial) {
                return;
            }

            setConfigStatus(Status.Loading);

            let attempt = 0;
            const load = () =>
                fetch("/config.json")
                    .then((res) => res.json())
                    .catch(async () => {
                        if (attempt < 2) {
                            return new Promise((resolve) => {
                                timeOutId = window.setTimeout(
                                    async () => {
                                        ++attempt;
                                        resolve(await load());
                                    },
                                    Math.pow(2, attempt) * 1000,
                                );
                            });
                        }
                    });

            let finalConfig = config;
            if (import.meta.env.MODE === "development") {
                dataApi.serviceUrl = config.dataV2ServerUrl + "/api";
            } else {
                const cfg = await load();
                if (cfg) {
                    dispatch(explorerActions.setConfig(cfg));
                    finalConfig = cfg;
                }

                dataApi.serviceUrl = (cfg?.dataV2ServerUrl ?? config.dataV2ServerUrl) + "/api";
            }

            initMixpanel(finalConfig.mixpanelToken);
            setConfigStatus(Status.Ready);
        }

        return () => {
            clearTimeout(timeOutId);
        };
    }, [dispatch, configStatus, config]);

    useEffect(() => {
        const state = getOAuthState();

        if (state && state.sceneId) {
            history.replace(`/${state.sceneId}${window.location.search}`);
        }
    }, [history]);

    useEffect(() => {
        const handleOnline = () => dispatch(explorerActions.toggleIsOnline(true));
        const handleOffline = () => dispatch(explorerActions.toggleIsOnline(false));
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [dispatch]);

    const loggedIn = useCallback(
        (accessToken: string, user: User) => {
            mixpanel?.identify(user.user);
            mixpanel?.people.set({
                "User Org": user.organization,
            });
            dispatch(authActions.login({ accessToken, user }));
            saveToStorage(StorageKey.AccessToken, accessToken);
        },
        [dispatch],
    );

    const authenticating = useRef(false);
    useEffect(() => {
        handleOAuth();

        async function handleOAuth() {
            if (
                configStatus !== Status.Ready ||
                authStatus !== Status.Initial ||
                authenticating.current ||
                useTokenFromUrl
            ) {
                return;
            }

            const state = getOAuthState();

            setAuthStatus(Status.Loading);
            authenticating.current = true;

            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const tokenUrl = config.authServerUrl + "/token";

            if (state?.service === "self" && code) {
                window.history.replaceState(null, "", `${window.location.pathname}${state.query ?? ""}`);
                dispatch(explorerActions.setLocalBookmarkId(state.localBookmarkId));

                const res:
                    | {
                          access_token: string;
                          expires_in: number;
                          refresh_token: string;
                          refresh_token_expires_in: number;
                          token_type: string;
                      }
                    | undefined = await fetch(tokenUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        client_id: config.novorenderClientId,
                        client_secret: config.novorenderClientSecret,
                        code: code,
                        redirect_uri: window.location.origin,
                        code_verifier: getFromStorage(StorageKey.CodeVerifier),
                    }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw res.statusText;
                        }
                        return res.json();
                    })
                    .then((res) => {
                        if (res.access_token) {
                            return res;
                        } else {
                            throw res;
                        }
                    })
                    .catch((e) => {
                        console.warn(e);
                    });

                if (res) {
                    const user = await getUser(res.access_token);

                    if (user) {
                        saveToStorage(
                            StorageKey.RefreshToken,
                            JSON.stringify({
                                token: res.refresh_token,
                                expires: Date.now() + res.refresh_token_expires_in * 1000,
                            }),
                        );
                        loggedIn(res.access_token, user);
                    }
                }
            } else {
                const storedRefreshToken = getFromStorage(StorageKey.RefreshToken);

                if (!storedRefreshToken) {
                    setAuthStatus(Status.Ready);
                    return;
                }

                try {
                    const parsedToken = JSON.parse(storedRefreshToken) as { token: string; expires: number };

                    const res = await fetch(tokenUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            grant_type: "refresh_token",
                            client_id: config.novorenderClientId,
                            client_secret: config.novorenderClientSecret,
                            refresh_token: parsedToken.token,
                        }),
                    })
                        .then((res) => {
                            if (!res.ok) {
                                throw res.statusText;
                            }
                            return res.json();
                        })
                        .then((res) => {
                            if (res.access_token) {
                                return res;
                            } else {
                                throw res;
                            }
                        });

                    if (res) {
                        const user = await getUser(res.access_token);

                        if (user) {
                            saveToStorage(
                                StorageKey.RefreshToken,
                                JSON.stringify({
                                    token: res.refresh_token,
                                    expires: parsedToken.expires,
                                }),
                            );

                            loggedIn(res.access_token, user);
                        }
                    }
                } catch {
                    deleteFromStorage(StorageKey.RefreshToken);
                }
            }

            setAuthStatus(Status.Ready);
        }
    }, [history, dispatch, authStatus, config, configStatus, useTokenFromUrl, loggedIn]);

    useEffect(() => {
        handleIframeAuth();

        async function handleIframeAuth() {
            if (
                configStatus !== Status.Ready ||
                authStatus !== Status.Initial ||
                authenticating.current ||
                !useTokenFromUrl
            ) {
                return;
            }

            const accessToken = new URLSearchParams(window.location.search).get("accessToken");
            const user = accessToken ? await getUser(accessToken) : undefined;

            if (accessToken && user) {
                loggedIn(accessToken, user);
            }
            setAuthStatus(Status.Ready);
        }
    }, [authStatus, configStatus, dispatch, useTokenFromUrl, loggedIn]);

    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enLocale}>
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        {authStatus !== Status.Ready || configStatus !== Status.Ready ? (
                            <Loading />
                        ) : (
                            <>
                                {needRefresh && <UpdatePrompt update={() => updateServiceWorker(true)} />}
                                <Switch>
                                    <Route path="/callback">
                                        <Loading />
                                    </Route>
                                    <Route path="/explorer/:id?">
                                        <Explorer />
                                    </Route>
                                    <Route path="/login/:id?">
                                        <RedirectLegacyLoginUrl />
                                    </Route>
                                    <Route path="/:id?">
                                        <Explorer />
                                    </Route>
                                </Switch>
                            </>
                        )}
                    </ThemeProvider>
                </StyledEngineProvider>
            </LocalizationProvider>
        </>
    );
}

function UpdatePrompt({ update }: { update: () => void }) {
    const { t } = useTranslation();
    const [updating, setUpdating] = useState(false);

    return (
        <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
                bottom: { xs: 132, sm: "auto" },
                top: { xs: "auto", sm: 32 },
                [`& .${snackbarContentClasses.root}`]: {
                    py: 2,
                },
            }}
            open={true}
            message={"A new version is available."}
        >
            <Paper
                sx={{
                    px: 2,
                    py: 1.5,
                    background: (theme) => theme.palette.secondary.main,
                    color: "#fff",
                }}
            >
                <>
                    {t("newVersionAvailable")}
                    <LoadingButton
                        loading={updating}
                        loadingIndicator={<CircularProgress size={20} />}
                        variant={"contained"}
                        size="small"
                        onClick={() => {
                            setUpdating(true);
                            update();
                        }}
                        sx={{ ml: 2, color: "#fff" }}
                    >
                        {t("update")}
                    </LoadingButton>
                </>
            </Paper>
        </Snackbar>
    );
}

function RedirectLegacyLoginUrl() {
    const location = useLocation();
    const params = useParams();

    return <Redirect to={generatePath(location.pathname.replace("/login", ""), params) + location.search} />;
}
