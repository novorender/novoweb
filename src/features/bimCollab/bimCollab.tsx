import { Box, Typography, useTheme, Button } from "@mui/material";
import { FormEventHandler, ReactNode, useEffect, useState } from "react";
import { MemoryRouter, Switch, Route, useHistory } from "react-router-dom";
import { Scene, View } from "@novorender/webgl-api";

import { LinearProgress, TextField } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { Filters } from "./routes/filters";
import { Topic } from "./routes/topic";
import { Project } from "./routes/project";
import { Projects } from "./routes/projects";

import { bimCollabActions, selectAccessToken, selectSpace, selectVersion } from "./bimCollabSlice";
import { authenticate, useGetAuthInfoQuery, useGetCurrentUserQuery, useGetVersionsQuery } from "./bimCollabApi";
import { CreateTopic } from "./routes/createTopic";
import { CreateComment } from "./routes/createComment";
import { AuthInfo } from "./types";
import { saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";

export function BimCollab({ view, scene }: { view: View; scene: Scene }) {
    const space = useAppSelector(selectSpace);
    const apiVersion = useAppSelector(selectVersion);
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();

    const {
        data: versionsRes,
        isError: apiError,
        refetch: refetchApiVersions,
    } = useGetVersionsQuery(undefined, { skip: !space || Boolean(apiVersion) });

    const { data: authInfoRes } = useGetAuthInfoQuery(undefined, {
        skip: !Boolean(apiVersion),
    });

    const { data: user } = useGetCurrentUserQuery(undefined, { skip: !accessToken });

    useEffect(() => {
        if (!versionsRes) {
            return;
        }

        const { versions } = versionsRes;
        const version =
            versions.find((ver) => ver.version_id === "2.1") ?? versions.find((ver) => ver.version_id === "bc_2.1");

        dispatch(bimCollabActions.setVersion(version?.version_id ?? "2.1"));
    }, [versionsRes, dispatch]);

    useEffect(() => {
        if (space && authInfoRes && !user) {
            saveToStorage(StorageKey.BimCollabSpace, space);
            init(authInfoRes);
        }

        async function init(authInfo: AuthInfo) {
            const accessToken = await authenticate(authInfo);

            if (!accessToken) {
                return;
            }

            dispatch(bimCollabActions.setAccessToken(accessToken));
        }
    }, [space, user, authInfoRes, dispatch]);

    if (!space || apiError) {
        return <EnterBimCollabSpace error={apiError} refetchApiVersions={refetchApiVersions} />;
    }

    return user ? (
        <MemoryRouter>
            <HijackBackButton>
                <Switch>
                    <Route path="/" exact>
                        <Projects />
                    </Route>
                    <Route path="/project/:projectId" exact>
                        {<Project />}
                    </Route>
                    <Route path="/project/:projectId/topic/:topicId" exact>
                        <Topic view={view} scene={scene} />
                    </Route>
                    <Route path="/project/:projectId/filter" exact>
                        <Filters />
                    </Route>
                    <Route path="/project/:projectId/new-topic" exact>
                        <CreateTopic view={view} scene={scene} />
                    </Route>
                    <Route path="/project/:projectId/topic/:topicId/new-comment" exact>
                        <CreateComment view={view} scene={scene} />
                    </Route>
                </Switch>
            </HijackBackButton>
        </MemoryRouter>
    ) : (
        <LinearProgress />
    );
}

function HijackBackButton({ children }: { children: ReactNode }) {
    const history = useHistory();

    return (
        <Box
            display="flex"
            flexDirection="column"
            height={1}
            onMouseDown={(e) => {
                if (e.button === 3) {
                    e.preventDefault();
                    history.goBack();
                }
            }}
        >
            {children}
        </Box>
    );
}

function EnterBimCollabSpace({ error, refetchApiVersions }: { error?: boolean; refetchApiVersions: () => void }) {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const currentSpace = useAppSelector(selectSpace);

    const [space, setSpace] = useState("");

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        dispatch(bimCollabActions.setSpace(space.toLowerCase().trim()));

        if (error) {
            refetchApiVersions();
        }
    };

    return (
        <Box p={1} height={1} position="relative">
            <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
            <Typography variant="h5" sx={{ mb: 1 }}>
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
