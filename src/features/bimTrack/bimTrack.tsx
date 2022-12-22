import { Box } from "@mui/material";
import { useCallback, useEffect } from "react";
import { MemoryRouter, Switch, Route } from "react-router-dom";

import { LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { WidgetList } from "features/widgetList";
import { useAppDispatch, useAppSelector } from "app/store";
import { StorageKey } from "config/storage";
import { featuresConfig } from "config/features";
import { getFromStorage, saveToStorage, deleteFromStorage } from "utils/storage";
import { createOAuthStateString } from "utils/auth";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { AuthInfo } from "types/bcf";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { Filters } from "./routes/filters";
import { Topic } from "./routes/topic";
import { Project } from "./routes/project";
import { Projects } from "./routes/projects";
import { CreateTopic } from "./routes/createTopic";
import { CreateComment } from "./routes/createComment";
import { EditTopic } from "./routes/editTopic";

import {
    bimTrackActions,
    BimTrackStatus,
    FilterType,
    selectAccessToken,
    selectAuthInfo,
    selectStatus,
} from "./bimTrackSlice";
import {
    getCode,
    useGetAuthInfoMutation,
    useGetCurrentUserQuery,
    useGetTokenMutation,
    useRefreshTokenMutation,
} from "./bimTrackApi";

export default function BimTrack() {
    const sceneId = useSceneId();
    const status = useAppSelector(selectStatus);
    const authInfo = useAppSelector(selectAuthInfo);
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.bimTrack.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.bimTrack.key;

    const { data: user } = useGetCurrentUserQuery(undefined, { skip: !accessToken });
    const [getToken] = useGetTokenMutation();
    const [refreshToken] = useRefreshTokenMutation();
    const [fetchAuthInfo] = useGetAuthInfoMutation();

    const authenticate = useCallback(
        async (authInfo: AuthInfo): Promise<string> => {
            const storedRefreshToken = getFromStorage(StorageKey.BimTrackRefreshToken);
            const code = new URLSearchParams(window.location.search).get("code");

            try {
                if (code) {
                    window.history.replaceState(null, "", window.location.pathname.replace("Callback", ""));

                    const res = await getToken({ code });

                    if (!("data" in res)) {
                        throw new Error("token request failed");
                    }

                    if (res.data.refresh_token) {
                        saveToStorage(StorageKey.BimTrackRefreshToken, res.data.refresh_token);
                    }

                    return res.data.access_token;
                } else if (storedRefreshToken) {
                    const res = await refreshToken({
                        refreshToken: storedRefreshToken,
                    });

                    if (!("data" in res)) {
                        throw new Error("get code");
                    }

                    if (res.data.refresh_token) {
                        saveToStorage(StorageKey.BimTrackRefreshToken, res.data.refresh_token);
                    } else {
                        deleteFromStorage(StorageKey.BimTrackRefreshToken);
                    }

                    return res.data.access_token;
                } else {
                    throw new Error("get code");
                }
            } catch (e) {
                if (e instanceof Error && e.message === "get code") {
                    const state = createOAuthStateString({
                        service: featuresConfig.bimTrack.key,
                        sceneId,
                    });

                    await getCode(authInfo.oauth2_auth_url, state);
                }

                return "";
            }
        },
        [getToken, refreshToken, sceneId]
    );

    useEffect(() => {
        if (status === BimTrackStatus.Initial) {
            getAuthInfo();
        }

        async function getAuthInfo() {
            dispatch(bimTrackActions.setStatus(BimTrackStatus.LoadingAuthInfo));
            const authInfoRes = await fetchAuthInfo();

            if (!("data" in authInfoRes)) {
                return;
            }

            dispatch(bimTrackActions.setStatus(BimTrackStatus.Ready));
            dispatch(bimTrackActions.setAuthInfo(authInfoRes.data));
        }
    }, [fetchAuthInfo, dispatch, authInfo, status]);

    useEffect(() => {
        if (authInfo) {
            init(authInfo);
        }

        async function init(authInfo: AuthInfo) {
            const accessToken = await authenticate(authInfo);

            if (!accessToken) {
                dispatch(bimTrackActions.logOut());
                return;
            }

            dispatch(bimTrackActions.setAccessToken(accessToken));
        }
    }, [authInfo, dispatch, authenticate]);

    useEffect(
        function initFilter() {
            if (user) {
                dispatch(bimTrackActions.setFilters({ [FilterType.AssignedTo]: [user.id] }));
            }
        },
        [user, dispatch]
    );

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.bimTrack} disableShadow={!menuOpen} />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    {accessToken ? (
                        <MemoryRouter>
                            <Switch>
                                <Route path="/" exact>
                                    <Projects />
                                </Route>
                                <Route path="/project/:projectId" exact>
                                    {<Project />}
                                </Route>
                                <Route path="/project/:projectId/topic/:topicId" exact>
                                    <Topic />
                                </Route>
                                <Route path="/project/:projectId/filter" exact>
                                    <Filters />
                                </Route>
                                <Route path="/project/:projectId/new-topic" exact>
                                    <CreateTopic />
                                </Route>
                                <Route path="/project/:projectId/topic/:topicId/new-comment" exact>
                                    <CreateComment />
                                </Route>
                                <Route path="/project/:projectId/topic/:topicId/edit" exact>
                                    <EditTopic />
                                </Route>
                            </Switch>
                        </MemoryRouter>
                    ) : (
                        <LinearProgress />
                    )}
                </Box>
                {menuOpen && (
                    <WidgetList
                        display={menuOpen ? "block" : "none"}
                        widgetKey={featuresConfig.bimTrack.key}
                        onSelect={toggleMenu}
                    />
                )}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.bimTrack.key}-widget-menu-fab`}
                ariaLabel="toggle widget menu"
            />
        </>
    );
}
