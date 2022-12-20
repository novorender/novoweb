import { useEffect, useState } from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import enLocale from "date-fns/locale/en-GB";
import { createAPI } from "@novorender/webgl-api";
import { createMeasureAPI } from "@novorender/measure-api";
import { createAPI as createDataAPI } from "@novorender/data-js-api";
import { MsalProvider } from "@azure/msal-react";
import { InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import { Route, useHistory, Switch } from "react-router-dom";
import { getGPUTier } from "detect-gpu";

import { theme } from "app/theme";
import { useAppDispatch } from "app/store";
import { Loading } from "components";
import { Explorer } from "pages/explorer";
import { Login } from "pages/login";
import { authActions } from "slices/authSlice";
import { loginRequest, msalConfig } from "config/auth";
import { dataServerBaseUrl, offscreenCanvas } from "config";
import {
    CustomNavigationClient,
    getAccessToken,
    getOAuthState,
    getStoredActiveMsalAccount,
    getUser,
    storeActiveAccount,
} from "utils/auth";
import { getAuthHeader } from "utils/auth";
import { StorageKey } from "config/storage";
import { deleteFromStorage, getFromStorage } from "utils/storage";

export const api = createAPI({ noOffscreenCanvas: !offscreenCanvas });
try {
    const debugProfile =
        new URLSearchParams(window.location.search).get("debugDeviceProfile") ?? localStorage["debugDeviceProfile"];

    if (debugProfile) {
        api.deviceProfile = { ...api.deviceProfile, ...JSON.parse(debugProfile), debugProfile: true };
        console.log(api.version, "using debug device profile");
    }
} catch (e) {
    console.warn(e);
}
const deviceProfileInitialized = (api.deviceProfile as any).debugProfile ? Promise.resolve() : loadDeviceProfile();

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
    const [authStatus, setAuthStatus] = useState(Status.Initial);
    const [deviceProfileStatus, setDeviceProfileStatus] = useState(Status.Initial);
    const dispatch = useAppDispatch();

    useEffect(() => {
        msalInstance.setNavigationClient(new CustomNavigationClient(history));
    }, [history]);

    useEffect(() => {
        if (authStatus !== Status.Initial) {
            return;
        }

        auth();

        async function auth() {
            setAuthStatus(Status.Loading);

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
            if (user) {
                dispatch(authActions.login({ accessToken, user }));
                return true;
            }
        }
    }, [authStatus, dispatch, history]);

    useEffect(() => {
        loadDeviceProfile();

        async function loadDeviceProfile() {
            if (deviceProfileStatus !== Status.Initial) {
                return;
            }

            setDeviceProfileStatus(Status.Loading);
            await deviceProfileInitialized;
            setDeviceProfileStatus(Status.Ready);
        }
    }, [deviceProfileStatus]);

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
                            {[authStatus, deviceProfileStatus].some((status) => status !== Status.Ready) ? (
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

async function loadDeviceProfile(): Promise<void> {
    try {
        const tiers = [0, 50, 75, 300];
        const { tier, isMobile, device, fps } = await getGPUTier({
            mobileTiers: tiers,
            desktopTiers: tiers,
        });

        const { name } = api.deviceProfile;
        api.deviceProfile = {
            ...api.deviceProfile,
            name: `${api.deviceProfile.name}${/tier/i.test(name) ? "" : `; tier${tier} (${fps})`}${
                /(pc|mobile)/i.test(name) ? "" : `; ${isMobile ? "Mobile" : "PC"}`
            }`,
        };

        switch (tier) {
            case 0:
                const fhd = 1920 * 1080;
                const screen = window.screen.width * window.screen.height;

                if (screen > fhd) {
                    api.deviceProfile = {
                        ...api.deviceProfile,
                        renderResolution: fhd / screen,
                    };
                }
                return;
            case 1:
                if (isMobile) {
                    api.deviceProfile = {
                        ...api.deviceProfile,
                        renderResolution: 1,
                        gpuBytesLimit: Math.max(750_000_000, api.deviceProfile.gpuBytesLimit),
                    };
                } else {
                    api.deviceProfile = {
                        ...api.deviceProfile,
                        gpuBytesLimit: Math.max(1_000_000, api.deviceProfile.gpuBytesLimit),
                        detailBias: Math.max(0.4, api.deviceProfile.detailBias),
                    };
                }
                return;
            case 2:
                if (isMobile) {
                    api.deviceProfile = {
                        ...api.deviceProfile,
                        triangleLimit: Math.max(7_500_000, api.deviceProfile.triangleLimit),
                        weakDevice: false,
                    };

                    const apple = device?.includes("apple");
                    if (apple) {
                        api.deviceProfile = {
                            ...api.deviceProfile,
                            gpuBytesLimit: Math.max(750_000_000, api.deviceProfile.gpuBytesLimit),
                        };
                    } else {
                        api.deviceProfile = {
                            ...api.deviceProfile,
                            gpuBytesLimit: Math.max(1_000_000_000, api.deviceProfile.gpuBytesLimit),
                            detailBias: Math.max(0.5, api.deviceProfile.detailBias),
                        };
                    }
                } else {
                    api.deviceProfile = {
                        ...api.deviceProfile,
                        weakDevice: false,
                    };
                }
                return;
            case 3:
                if (isMobile) {
                    // skip
                } else {
                    api.deviceProfile = {
                        ...api.deviceProfile,
                        detailBias: Math.max(1.5, api.deviceProfile.detailBias),
                        triangleLimit: Math.max(20_000_000, api.deviceProfile.triangleLimit),
                        gpuBytesLimit: Math.max(4_000_000_000, api.deviceProfile.gpuBytesLimit),
                        renderResolution: 1,
                    };
                }
                return;
        }
    } catch (e) {
        console.warn(e);
    }
}
