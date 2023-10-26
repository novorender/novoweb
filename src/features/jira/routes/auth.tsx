import { Box, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { Redirect, useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { StorageKey } from "config/storage";
import { selectConfig, selectHasAdminCapabilities } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";

import {
    useGetAccessibleResourcesQuery,
    useGetComponentsQuery,
    useGetCurrentUserQuery,
    useGetProjectsQuery,
    useLazyGetTokensQuery,
    useRefreshTokensMutation,
} from "../jiraApi";
import {
    jiraActions,
    selectJiraAccessToken,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraConfig,
    selectJiraProject,
    selectJiraSpace,
    selectJiraUser,
} from "../jiraSlice";

let getTokensRequestInitialized = false;

export function Auth() {
    const history = useHistory();
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const accessToken = useAppSelector(selectJiraAccessToken);
    const accessTokenStr = useAppSelector(selectJiraAccessTokenData);
    const currentUser = useAppSelector(selectJiraUser);
    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const config = useAppSelector(selectJiraConfig);
    const explorerConfig = useAppSelector(selectConfig);
    const [error, setError] = useState("");

    const [getTokens, { data: tokensResponse, error: tokensError }] = useLazyGetTokensQuery();
    const [refreshTokens] = useRefreshTokensMutation();

    const { data: accessibleResources, error: accessibleResourcesError } = useGetAccessibleResourcesQuery(
        { accessToken: accessTokenStr },
        { skip: !accessTokenStr }
    );

    const { data: user, error: userError } = useGetCurrentUserQuery(undefined, { skip: !accessTokenStr || !space });

    const { data: projects, error: projectsError } = useGetProjectsQuery(
        { space: space?.id ?? "", accessToken: accessTokenStr },
        { skip: !space || !user || !accessTokenStr }
    );

    const { data: components, error: componentsError } = useGetComponentsQuery(
        { space: space?.id ?? "", project: project?.key ?? "", accessToken: accessTokenStr },
        { skip: !space || !accessTokenStr || !project }
    );

    useEffect(() => {
        tryAuthenticating();

        async function tryAuthenticating() {
            if (accessToken.status !== AsyncStatus.Initial) {
                return;
            }

            const code = new URLSearchParams(window.location.search).get("code");
            const refreshToken = getFromStorage(StorageKey.JiraRefreshToken);

            if (getTokensRequestInitialized) {
                return;
            } else if (code) {
                window.history.replaceState(null, "", window.location.pathname);
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Loading }));
                getTokensRequestInitialized = true;
                getTokens({ code, config: explorerConfig });
            } else if (refreshToken) {
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Loading }));

                const res = await refreshTokens({ refreshToken, config: explorerConfig });

                if ("data" in res) {
                    saveToStorage(StorageKey.JiraRefreshToken, res.data.refresh_token);
                    dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.access_token }));
                    dispatch(
                        jiraActions.setRefreshToken({ token: res.data.refresh_token, refreshIn: res.data.expires_in })
                    );
                } else {
                    console.warn(res.error);
                    deleteFromStorage(StorageKey.JiraRefreshToken);
                    dispatch(jiraActions.setRefreshToken(undefined));
                    history.push("/login");
                }
            } else {
                history.push("/login");
            }
        }
    }, [accessToken, getTokens, dispatch, history, refreshTokens, explorerConfig]);

    useEffect(() => {
        if (accessToken.status !== AsyncStatus.Loading || !(tokensResponse || tokensError)) {
            return;
        }

        if (tokensResponse) {
            dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: tokensResponse.access_token }));
            saveToStorage(StorageKey.JiraRefreshToken, tokensResponse.refresh_token);
        } else {
            console.warn(tokensError);
            dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Error, msg: "An error occurred." }));
        }
    }, [accessToken, tokensResponse, tokensError, dispatch]);

    useEffect(() => {
        if (!user || currentUser) {
            return;
        }

        dispatch(jiraActions.setUser(user));
    }, [dispatch, user, currentUser]);

    useEffect(() => {
        if (!accessibleResources || space) {
            return;
        }

        const _space = accessibleResources.find((resource) => resource.name === config?.space.toLowerCase());

        if (_space) {
            dispatch(jiraActions.setSpace(_space));
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!config.space) {
            setError(`Jira has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${config?.space} Jira space.`);
        }
    }, [accessibleResources, history, isAdmin, dispatch, config, space]);

    useEffect(() => {
        if (!projects || project) {
            return;
        }

        const _project = projects.find((project) => project.key === config?.project);

        if (_project) {
            dispatch(jiraActions.setProject(_project));
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!config.project) {
            setError(`Jira has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${config?.project} Jira project.`);
        }
    }, [projects, history, isAdmin, dispatch, config, project]);

    useEffect(() => {
        if (!components || component) {
            return;
        }

        const _component = components.find((component) => component.name === config?.component);

        if (_component) {
            dispatch(jiraActions.setComponent(_component));
            history.push("/issues");
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!config.component) {
            setError(`Jira has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${config?.component} Jira component.`);
        }
    }, [components, history, isAdmin, dispatch, config, component]);

    useEffect(() => {
        if (error || !(accessibleResourcesError || projectsError || componentsError || userError)) {
            return;
        }

        const kind = accessibleResourcesError
            ? "spaces"
            : projectsError
            ? "projects"
            : componentsError
            ? "components"
            : "user";
        setError(`An error occurred while loading Jira ${kind}.`);
    }, [accessibleResourcesError, projectsError, componentsError, userError, error]);

    if (space && project && component && user && accessTokenStr) {
        return <Redirect to="/issues" />;
    } else if (error) {
        return <ErrorMsg>{error}</ErrorMsg>;
    } else if (accessToken.status === AsyncStatus.Error) {
        return <ErrorMsg>{accessToken.msg}</ErrorMsg>;
    } else {
        return (
            <Box position="relative">
                <LinearProgress />
            </Box>
        );
    }
}

function ErrorMsg({ children }: { children: string }) {
    const theme = useTheme();

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1}>
                <Typography>{children}</Typography>
            </ScrollBox>
        </>
    );
}
