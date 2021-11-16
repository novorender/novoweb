import { useEffect } from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { createAPI } from "@novorender/webgl-api";
import { createAPI as createDataAPI } from "@novorender/data-js-api";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { BrowserRouter, Route, useHistory, Switch } from "react-router-dom";

import { theme } from "app/theme";
import { useAppDispatch } from "app/store";
import { Loading } from "components";
import { Explorer } from "pages/explorer";
import { authActions } from "slices/authSlice";
import { msalConfig } from "config/auth";
import { dataServerBaseUrl, offscreenCanvas, hasCreateImageBitmap } from "config";
import { CustomNavigationClient, getOAuthState, storeActiveAccount } from "utils/auth";
import { getAuthHeader } from "utils/auth";
import { useMountedState } from "hooks/useMountedState";

export const api = createAPI({ webGL1Only: !hasCreateImageBitmap, noOffscreenCanvas: !offscreenCanvas });
export const dataApi = createDataAPI({ authHeader: getAuthHeader, serviceUrl: dataServerBaseUrl });
export const msalInstance = new PublicClientApplication(msalConfig);

enum Status {
    Initial,
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

        handleMsalReturn();

        async function handleMsalReturn() {
            try {
                const res = await msalInstance.handleRedirectPromise();

                if (res) {
                    msalInstance.setActiveAccount(res.account);
                    storeActiveAccount(res.account);
                    dispatch(authActions.login({ accessToken: res.accessToken, msalAccount: res.account }));
                }
            } catch (e) {
                console.warn(e);
            }

            setStatus(Status.Ready);
        }
    }, [status, setStatus, dispatch]);

    useEffect(() => {
        const state = getOAuthState();

        if (state && state.sceneId) {
            history.replace(`/${state.sceneId}${window.location.search}`);
        }
    }, [history]);

    return (
        <>
            <MsalProvider instance={msalInstance}>
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        {status === Status.Initial ? (
                            <Loading />
                        ) : (
                            <BrowserRouter>
                                <Switch>
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
                            </BrowserRouter>
                        )}
                    </ThemeProvider>
                </StyledEngineProvider>
            </MsalProvider>
        </>
    );
}
