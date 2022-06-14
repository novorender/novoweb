import { useEffect } from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/lab";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import enLocale from "date-fns/locale/en-GB";
import { createAPI } from "@novorender/webgl-api";
import { createMeasureAPI } from "@novorender/measure-api";
import { createAPI as createDataAPI } from "@novorender/data-js-api";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { Route, useHistory, Switch } from "react-router-dom";

import { theme } from "app/theme";
import { useAppDispatch } from "app/store";
import { Loading } from "components";
import { Explorer } from "pages/explorer";
import { Login } from "pages/login";
import { authActions } from "slices/authSlice";
import { msalConfig } from "config/auth";
import { dataServerBaseUrl, offscreenCanvas } from "config";
import { CustomNavigationClient, getAccessToken, getOAuthState, getUser, storeActiveAccount } from "utils/auth";
import { getAuthHeader } from "utils/auth";
import { useMountedState } from "hooks/useMountedState";
import { StorageKey } from "config/storage";
import { deleteFromStorage, getFromStorage } from "utils/storage";

export const api = createAPI({ noOffscreenCanvas: !offscreenCanvas });
export const dataApi = createDataAPI({ authHeader: getAuthHeader, serviceUrl: dataServerBaseUrl });
export const measureApi = createMeasureAPI();
export const msalInstance = new PublicClientApplication(msalConfig);

enum Status {
    Initial,
    Loading,
    Ready,
}

export function App() {
    const history = useHistory();
    const [status, setStatus] = useMountedState(Status.Initial);
    const dispatch = useAppDispatch();

    useEffect(() => {
        msalInstance.setNavigationClient(new CustomNavigationClient(history));
    }, [history]);

    useEffect(() => {
        if (status !== Status.Initial) {
            return;
        }

        auth();

        async function auth() {
            setStatus(Status.Loading);

            if (!(await verifyToken())) {
                await handleMsalReturn();
            }

            setStatus(Status.Ready);
        }

        async function handleMsalReturn() {
            try {
                const res = await msalInstance.handleRedirectPromise();

                if (res) {
                    msalInstance.setActiveAccount(res.account);
                    storeActiveAccount(res.account);

                    const accessToken = await getAccessToken(res.accessToken);
                    if (!accessToken) {
                        return;
                    }

                    const user = await getUser(accessToken);
                    if (!user) {
                        throw new Error("Failed to get user.");
                    }

                    dispatch(authActions.login({ accessToken: res.accessToken, msalAccount: res.account, user }));
                    history.replace(history.location.pathname.replace("login/", "") + window.location.search);
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
            if (user) {
                dispatch(authActions.login({ accessToken, user }));
                return true;
            }
        }
    }, [status, setStatus, dispatch, history]);

    useEffect(() => {
        const state = getOAuthState();

        if (state && state.sceneId) {
            history.replace(`/${state.sceneId}${window.location.search}`);
        }
    }, [history]);

    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={enLocale}>
                <MsalProvider instance={msalInstance}>
                    <StyledEngineProvider injectFirst>
                        <ThemeProvider theme={theme}>
                            <CssBaseline />
                            {status !== Status.Ready ? (
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
