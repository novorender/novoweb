import { InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { LoadingButton } from "@mui/lab";
import { CircularProgress, CssBaseline, Paper, Snackbar, snackbarContentClasses } from "@mui/material";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createAPI as createDataAPI } from "@novorender/data-js-api";
import enLocale from "date-fns/locale/en-GB";
import { useEffect, useRef, useState } from "react";
import { Route, Switch, useHistory } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useAppDispatch } from "app/store";
import { theme } from "app/theme";
import { Loading } from "components";
import { dataServerBaseUrl } from "config/app";
import { loginRequest, msalConfig } from "config/auth";
import { StorageKey } from "config/storage";
import { Explorer } from "pages/explorer";
import { Login } from "pages/login";
import { authActions } from "slices/authSlice";
import { explorerActions } from "slices/explorerSlice";
import {
    CustomNavigationClient,
    getAccessToken,
    getAuthHeader,
    getOAuthState,
    getStoredActiveMsalAccount,
    getUser,
    storeActiveAccount,
} from "utils/auth";
import { deleteFromStorage, getFromStorage } from "utils/storage";

export const isIpad =
    /\biPad/.test(navigator.userAgent) ||
    (/\bMobile\b/.test(navigator.userAgent) && /\bMacintosh\b/.test(navigator.userAgent));
export const isIphone = /\biPhone/.test(navigator.userAgent);

export const dataApi = createDataAPI({ authHeader: getAuthHeader, serviceUrl: dataServerBaseUrl });
export const msalInstance = new PublicClientApplication(msalConfig);

enum Status {
    Initial,
    Loading,
    Ready,
}

export function App() {
    const history = useHistory();
    const [msalStatus, setMsalStatus] = useState(Status.Initial);
    const [authStatus, setAuthStatus] = useState(Status.Initial);
    const [configStatus, setConfigStatus] = useState(
        import.meta.env.MODE === "development" ? Status.Ready : Status.Initial
    );
    const dispatch = useAppDispatch();

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        immediate: false,
    });

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

    useEffect(() => {
        msalInstance.initialize().then(() => setMsalStatus(Status.Ready));
    }, []);

    useEffect(() => {
        if (msalStatus === Status.Ready) {
            msalInstance.setNavigationClient(new CustomNavigationClient(history));
        }
    }, [msalStatus, history]);

    const authenticating = useRef(false);
    useEffect(() => {
        if (authStatus !== Status.Initial || authenticating.current || msalStatus !== Status.Ready) {
            return;
        }

        authenticating.current = true;
        setAuthStatus(Status.Loading);
        auth();

        async function auth() {
            if (!(await verifyToken())) {
                await handleMsalReturn();
            } else {
                const query = new URLSearchParams(window.location.search);
                if (!query.get("force-login")) {
                    history.replace(history.location.pathname.replace("login/", "") + window.location.search);
                }
            }
            setAuthStatus(Status.Ready);
        }

        async function handleMsalReturn() {
            try {
                const res = await msalInstance.handleRedirectPromise().then((res) => {
                    if (res) {
                        return res;
                    }

                    const account = getStoredActiveMsalAccount();

                    if (!account) {
                        return;
                    }

                    return msalInstance
                        .acquireTokenSilent({
                            ...loginRequest,
                            account,
                            authority: account.tenantId
                                ? `https://login.microsoftonline.com/${account.tenantId}`
                                : loginRequest.authority,
                        })
                        .catch((e) => {
                            if (e instanceof InteractionRequiredAuthError) {
                                return msalInstance
                                    .acquireTokenPopup({
                                        ...loginRequest,
                                        account,
                                        sid: account.idTokenClaims?.sid,
                                        loginHint: account.idTokenClaims?.login_hint,
                                        authority: account.tenantId
                                            ? `https://login.microsoftonline.com/${account.tenantId}`
                                            : loginRequest.authority,
                                    })
                                    .catch(() => {
                                        dispatch(authActions.setMsalInteractionRequired(true));
                                    });
                            } else {
                                throw e;
                            }
                        });
                });

                if (res) {
                    const accessToken = await getAccessToken(res.accessToken);
                    if (!accessToken) {
                        throw new Error("Failed to get access token.");
                    }

                    const user = await getUser(accessToken);
                    if (!user) {
                        throw new Error("Failed to get user.");
                    }

                    msalInstance.setActiveAccount(res.account);
                    storeActiveAccount(res.account);
                    dispatch(authActions.login({ accessToken: res.accessToken, msalAccount: res.account, user }));
                }
            } catch (e) {
                deleteFromStorage(StorageKey.MsalActiveAccount);
                console.warn("msal:", e);
            }
        }

        async function verifyToken() {
            let accessToken = "";

            try {
                const stored = getFromStorage(StorageKey.NovoToken);

                if (!stored) {
                    return;
                }
                const storedToken = JSON.parse(stored);

                // Force relog if less than 12 hours left to prevent token expiring mid session
                if (storedToken.expiry - Date.now() >= 1000 * 60 * 60 * 12) {
                    accessToken = storedToken.token;
                } else {
                    throw new Error("Token has expired");
                }
            } catch (e) {
                console.warn(e);
                deleteFromStorage(StorageKey.NovoToken);
                return;
            }

            const user = await getUser(accessToken);
            if (user) {
                dispatch(authActions.login({ accessToken, user }));
                return true;
            }
        }
    }, [authStatus, dispatch, history, msalStatus]);

    useEffect(() => {
        const state = getOAuthState();

        if (state && state.sceneId) {
            history.replace(`/${state.sceneId}${window.location.search}`);
        }
    }, [history]);

    useEffect(() => {
        if (configStatus !== Status.Initial) {
            return;
        }

        let timeOutId = 0;
        setConfigStatus(Status.Loading);
        initConfig();

        async function initConfig() {
            let attempt = 0;
            const load = () =>
                fetch("/config.json")
                    .then((res) => res.json())
                    .catch(async () => {
                        if (attempt < 2) {
                            return new Promise((resolve) => {
                                timeOutId = setTimeout(async () => {
                                    ++attempt;
                                    resolve(await load());
                                }, Math.pow(2, attempt) * 1000);
                            });
                        }
                    });

            const cfg = await load();
            if (cfg) {
                dispatch(explorerActions.setConfig(cfg));
            }
            setConfigStatus(Status.Ready);
        }

        return () => {
            clearTimeout(timeOutId);
        };
    }, [dispatch, configStatus]);

    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enLocale}>
                <MsalProvider instance={msalInstance}>
                    <StyledEngineProvider injectFirst>
                        <ThemeProvider theme={theme}>
                            <CssBaseline />
                            {authStatus !== Status.Ready || configStatus !== Status.Ready ? (
                                <Loading />
                            ) : (
                                <>
                                    {needRefresh && <UpdatePrompt update={() => updateServiceWorker(true)} />}
                                    <Switch>
                                        <Route path="/login/:id">
                                            <Login />
                                        </Route>
                                        <Route path="/callback">
                                            <Loading />
                                        </Route>
                                        <Route path="/explorer/:id?">
                                            <Explorer />
                                        </Route>
                                        <Route path="/:id?">
                                            <Explorer />
                                        </Route>
                                    </Switch>
                                </>
                            )}
                        </ThemeProvider>
                    </StyledEngineProvider>
                </MsalProvider>
            </LocalizationProvider>
        </>
    );
}

function UpdatePrompt({ update }: { update: () => void }) {
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
                    A new version is available.
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
                        Update
                    </LoadingButton>
                </>
            </Paper>
        </Snackbar>
    );
}
