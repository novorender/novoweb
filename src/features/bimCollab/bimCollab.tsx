import { Box, Typography, useTheme, Button } from "@mui/material";
import { FormEventHandler, useCallback, useEffect, useState } from "react";
import { MemoryRouter, Switch, Route } from "react-router-dom";

import { LinearProgress, TextField } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { StorageKey } from "config/storage";
import { config as featuresConfig } from "config/features";
import { getFromStorage, saveToStorage, deleteFromStorage } from "utils/storage";
import { createOAuthStateString, getOAuthState } from "utils/auth";
import { useSceneId } from "hooks/useSceneId";

import { Filters } from "./routes/filters";
import { Topic } from "./routes/topic";
import { Project } from "./routes/project";
import { Projects } from "./routes/projects";
import { CreateTopic } from "./routes/createTopic";
import { CreateComment } from "./routes/createComment";
import { EditTopic } from "./routes/editTopic";

import { bimCollabActions, selectAccessToken, selectAuthInfo, selectSpace, selectVersion } from "./bimCollabSlice";
import {
    getCode,
    useGetAuthInfoMutation,
    useGetTokenMutation,
    useGetVersionsMutation,
    useRefreshTokenMutation,
} from "./bimCollabApi";
import { AuthInfo } from "./types";

export function BimCollab() {
    const sceneId = useSceneId();
    const space = useAppSelector(selectSpace);
    const apiVersion = useAppSelector(selectVersion);
    const authInfo = useAppSelector(selectAuthInfo);
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();

    const [getToken] = useGetTokenMutation();
    const [refreshToken] = useRefreshTokenMutation();

    const [fetchVersions, { isError: apiError }] = useGetVersionsMutation();
    const [fetchAuthInfo] = useGetAuthInfoMutation();

    const authenticate = useCallback(
        async (authInfo: AuthInfo, space: string): Promise<string> => {
            const storedRefreshToken = getFromStorage(StorageKey.BimCollabRefreshToken);
            const code = new URLSearchParams(window.location.search).get("code");

            try {
                if (code) {
                    window.history.replaceState(null, "", window.location.pathname.replace("Callback", ""));

                    const res = await getToken({ tokenUrl: authInfo.oauth2_token_url, code });

                    if (!("data" in res)) {
                        throw new Error("token request failed");
                    }

                    if (res.data.refresh_token) {
                        saveToStorage(StorageKey.BimCollabRefreshToken, res.data.refresh_token);
                    }

                    return res.data.access_token;
                } else if (storedRefreshToken) {
                    const res = await refreshToken({
                        tokenUrl: authInfo.oauth2_token_url,
                        refreshToken: storedRefreshToken,
                    });

                    if (!("data" in res)) {
                        throw new Error("get code");
                    }

                    if (res.data.refresh_token) {
                        saveToStorage(StorageKey.BimCollabRefreshToken, res.data.refresh_token);
                    } else {
                        deleteFromStorage(StorageKey.BimCollabRefreshToken);
                    }

                    return res.data.access_token;
                } else {
                    throw new Error("get code");
                }
            } catch (e) {
                if (e instanceof Error && e.message === "get code") {
                    const state = createOAuthStateString({
                        service: featuresConfig.bimCollab.key,
                        space: space,
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
        const state = getOAuthState();

        if (state?.space) {
            dispatch(bimCollabActions.setSpace(state.space));
        }
    }, [dispatch]);

    useEffect(() => {
        if (space && !apiVersion) {
            getVersion();
        }

        async function getVersion() {
            const versionRes = await fetchVersions();

            if (!("data" in versionRes)) {
                return;
            }

            const { versions } = versionRes.data;
            const version =
                versions.find((ver) => ver.version_id === "2.1") ?? versions.find((ver) => ver.version_id === "bc_2.1");

            dispatch(bimCollabActions.setVersion(version?.version_id ?? "2.1"));
        }
    }, [space, dispatch, apiVersion, fetchVersions]);

    useEffect(() => {
        if (space && apiVersion && !authInfo) {
            getAuthInfo();
        }

        async function getAuthInfo() {
            const authInfoRes = await fetchAuthInfo();

            if (!("data" in authInfoRes)) {
                return;
            }

            dispatch(bimCollabActions.setAuthInfo(authInfoRes.data));
        }
    }, [space, apiVersion, fetchAuthInfo, dispatch, authInfo]);

    useEffect(() => {
        if (space && authInfo) {
            init(authInfo, space);
        }

        async function init(authInfo: AuthInfo, space: string) {
            const accessToken = await authenticate(authInfo, space);

            if (!accessToken) {
                dispatch(bimCollabActions.logOut());
                return;
            }

            saveToStorage(StorageKey.BimCollabSuggestedSpace, space);
            dispatch(bimCollabActions.setAccessToken(accessToken));
        }
    }, [space, authInfo, dispatch, authenticate]);

    if (!space || apiError) {
        return <EnterBimCollabSpace error={apiError} />;
    }

    return accessToken ? (
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
    );
}

function EnterBimCollabSpace({ error }: { error?: boolean }) {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const currentSpace = useAppSelector(selectSpace);

    const [space, setSpace] = useState(getFromStorage(StorageKey.BimCollabSuggestedSpace));

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        deleteFromStorage(StorageKey.BimCollabSuggestedSpace);
        dispatch(bimCollabActions.logOut());
        dispatch(bimCollabActions.setSpace(space.toLowerCase().trim()));
    };

    return (
        <Box p={1} height={1} position="relative">
            <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
            <Typography variant="h5" sx={{ mt: 1, mb: 2 }}>
                Connect to BIMcollab
            </Typography>
            <form onSubmit={handleSubmit}>
                <Box display="flex" alignItems="center">
                    <TextField
                        error={error}
                        helperText={error ? `"${currentSpace}" is not a valid space` : ""}
                        autoComplete="bimcollab-space"
                        id="bimcollab-space"
                        label="BIMcollab space"
                        fullWidth
                        value={space}
                        onChange={(e) => setSpace(e.target.value)}
                        sx={{ mr: 1 }}
                    />
                    <Button type="submit" variant="contained">
                        Connect
                    </Button>
                </Box>
            </form>
        </Box>
    );
}
