import { InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { CssBaseline } from "@mui/material";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createAPI as createDataAPI } from "@novorender/data-js-api";
import { createMeasureAPI } from "@novorender/measure-api";
import enLocale from "date-fns/locale/en-GB";
import { useEffect, useRef, useState } from "react";
import { Route, Switch, useHistory } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { theme } from "app/theme";
import { Loading } from "components";
import { dataServerBaseUrl } from "config";
import { loginRequest, msalConfig } from "config/auth";
import { StorageKey } from "config/storage";
import { Explorer } from "pages/explorer";
import { Login } from "pages/login";
import { authActions } from "slices/authSlice";
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
export const measureApi = createMeasureAPI(window.location.origin + "/novorender/measure-api/");
export const msalInstance = new PublicClientApplication(msalConfig);

enum Status {
    Initial,
    Loading,
    Ready,
}

export function App() {
    const history = useHistory();
    const [authStatus, setAuthStatus] = useState(Status.Initial);
    const dispatch = useAppDispatch();

    useEffect(() => {
        msalInstance.setNavigationClient(new CustomNavigationClient(history));
    }, [history]);

    const authenticating = useRef(false);

    useEffect(() => {
        if (authStatus !== Status.Initial || authenticating.current) {
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
                        .ssoSilent({
                            ...loginRequest,
                            account,
                            sid: account.idTokenClaims?.sid,
                            loginHint: account.idTokenClaims?.login_hint,
                            authority: account.tenantId
                                ? `https://login.microsoftonline.com/${account.tenantId}`
                                : loginRequest.authority,
                        })
                        .catch(() => {
                            return msalInstance.acquireTokenSilent({
                                ...loginRequest,
                                account,
                                authority: account.tenantId
                                    ? `https://login.microsoftonline.com/${account.tenantId}`
                                    : loginRequest.authority,
                            });
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
                console.warn(e);
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
            console.log({ user, accessToken, todo: "TODO SLETT" });
            if (user) {
                dispatch(authActions.login({ accessToken, user }));
                return true;
            }
        }
    }, [authStatus, dispatch, history]);

    useEffect(() => {
        const state = getOAuthState();

        if (state && state.sceneId) {
            history.replace(`/${state.sceneId}${window.location.search}`);
        }
    }, [history]);

    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enLocale}>
                <MsalProvider instance={msalInstance}>
                    <StyledEngineProvider injectFirst>
                        <ThemeProvider theme={theme}>
                            <CssBaseline />
                            {authStatus !== Status.Ready ? (
                                <Loading />
                            ) : (
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
                            )}
                        </ThemeProvider>
                    </StyledEngineProvider>
                </MsalProvider>
            </LocalizationProvider>
        </>
    );
}
