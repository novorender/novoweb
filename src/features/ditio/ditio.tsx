import { PropsWithChildren, useCallback, useEffect, useRef } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { AuthConfig } from "./types";

import { LogoSpeedDial, WidgetContainer, WidgetHeader, LinearProgress } from "components";
import { featuresConfig } from "config/features";
import { StorageKey } from "config/storage";
import { WidgetList } from "features/widgetList";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectProjectSettings } from "slices/renderSlice";
import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";
import { getFromStorage, saveToStorage, deleteFromStorage } from "utils/storage";
import { createOAuthStateString } from "utils/auth";

import {
    getCode,
    useGetAuthConfigMutation,
    useGetProjectMutation,
    useGetTokenMutation,
    useRefreshTokenMutation,
} from "./ditioApi";
import {
    ditioActions,
    DitioStatus,
    selectAccessToken,
    selectAuthConfig,
    selectClickedMarker,
    selectLastViewedPath,
    selectProjectId,
    selectStatus,
} from "./ditioSlice";
import { Feed } from "./routes/feed";
import { Post } from "./routes/post";
import { Filters } from "./routes/filters";

export function Ditio() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle();

    const { ditioProjectNumber } = useAppSelector(selectProjectSettings);
    const status = useAppSelector(selectStatus);
    const accessToken = useAppSelector(selectAccessToken);
    const authConfig = useAppSelector(selectAuthConfig);
    const lastViewedPath = useAppSelector(selectLastViewedPath);
    const projectId = useAppSelector(selectProjectId);
    const dispatch = useAppDispatch();

    const [getToken] = useGetTokenMutation();
    const [refreshToken] = useRefreshTokenMutation();
    const [getAuthConfig] = useGetAuthConfigMutation();
    const [getProject] = useGetProjectMutation();

    const authenticate = useCallback(
        async (authConfig: AuthConfig): Promise<string> => {
            const storedRefreshToken = getFromStorage(StorageKey.DitioRefreshToken);
            const code = new URLSearchParams(window.location.search).get("code");

            try {
                if (code) {
                    window.history.replaceState(null, "", window.location.pathname);
                    const res = await getToken({ code, tokenEndpoint: authConfig.token_endpoint });

                    if (!("data" in res)) {
                        throw new Error("token request failed");
                    }

                    if (res.data.refresh_token) {
                        saveToStorage(StorageKey.DitioRefreshToken, res.data.refresh_token);
                    }

                    return res.data.access_token;
                } else if (storedRefreshToken) {
                    const res = await refreshToken({
                        refreshToken: storedRefreshToken,
                        tokenEndpoint: authConfig.token_endpoint,
                    });

                    if (!("data" in res)) {
                        throw new Error("get code");
                    }

                    if (res.data.refresh_token) {
                        saveToStorage(StorageKey.DitioRefreshToken, res.data.refresh_token);
                    } else {
                        deleteFromStorage(StorageKey.DitioRefreshToken);
                    }

                    return res.data.access_token;
                } else {
                    throw new Error("get code");
                }
            } catch (e) {
                if (e instanceof Error && e.message === "get code") {
                    const state = createOAuthStateString({
                        service: featuresConfig.ditio.key,
                        sceneId,
                    });

                    await getCode(authConfig.authorization_endpoint, state);
                }

                return "";
            }
        },
        [getToken, refreshToken, sceneId]
    );

    useEffect(() => {
        if (status === DitioStatus.Initial && ditioProjectNumber) {
            getConfig();
        }

        async function getConfig() {
            dispatch(ditioActions.setStatus(DitioStatus.LoadingAuthConfig));
            const authConfigRes = await getAuthConfig();

            if (!("data" in authConfigRes)) {
                return;
            }

            dispatch(ditioActions.setStatus(DitioStatus.Ready));
            dispatch(ditioActions.setAuthConfig(authConfigRes.data));
        }
    }, [getAuthConfig, dispatch, authConfig, status, ditioProjectNumber]);

    useEffect(() => {
        if (authConfig) {
            init(authConfig);
        }

        async function init(authConfig: AuthConfig) {
            const accessToken = await authenticate(authConfig);

            if (!accessToken) {
                dispatch(ditioActions.logOut());
                return;
            }

            dispatch(ditioActions.setAccessToken(accessToken));
        }
    }, [authConfig, dispatch, authenticate]);

    useEffect(() => {
        if (!projectId && accessToken && ditioProjectNumber) {
            getProjectId();
        }

        async function getProjectId() {
            const project = await getProject(ditioProjectNumber);

            if ("data" in project) {
                dispatch(ditioActions.setProjectId(project.data.id));
            }
        }
    }, [projectId, accessToken, ditioProjectNumber, getProject, dispatch]);

    const showRouter = Boolean(accessToken && projectId);

    return (
        <>
            <WidgetContainer minimized={minimized}>
                <WidgetHeader
                    minimized={minimized}
                    toggleMinimize={toggleMinimize}
                    widget={featuresConfig.ditio}
                    disableShadow={!menuOpen && showRouter}
                />

                {!showRouter && ditioProjectNumber ? (
                    <Box position={"relative"} bottom={minimized ? 3 : 0}>
                        <LinearProgress />
                    </Box>
                ) : null}

                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    {showRouter ? (
                        <MemoryRouter initialEntries={["/", lastViewedPath]} initialIndex={1}>
                            <CustomSwitch>
                                <Route path="/" exact>
                                    <Feed />
                                </Route>
                                <Route path="/post/:id">
                                    <Post />
                                </Route>
                                <Route path="/filters">
                                    <Filters />
                                </Route>
                            </CustomSwitch>
                        </MemoryRouter>
                    ) : !ditioProjectNumber ? (
                        <Box p={1}>
                            Missing Ditio project number. Admins can set this under Advanced settings -{">"} Project.
                        </Box>
                    ) : null}
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.ditio.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.ditio.key}-widget-menu-fab`} />
        </>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const history = useHistory();
    const location = useLocation();
    const willUnmount = useRef(false);
    const clickedMarker = useAppSelector(selectClickedMarker);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (clickedMarker) {
            history.push(`/post/${clickedMarker}`);
            dispatch(ditioActions.setClickedMarker(""));
        }
    }, [dispatch, history, clickedMarker]);

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                dispatch(ditioActions.setLastViewedPath(location.pathname));
            }
        };
    }, [location, dispatch]);

    return <Switch {...props} />;
}
