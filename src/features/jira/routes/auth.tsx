import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { AsyncStatus } from "types/misc";
import { selectProjectSettings } from "slices/renderSlice";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";
import { selectHasAdminCapabilities } from "slices/explorerSlice";

import {
    jiraActions,
    selectJiraSpace,
    selectJiraAccessToken,
    selectJiraAccessTokenData,
    selectJiraProject,
    selectJiraComponent,
} from "../jiraSlice";
import {
    useGetAccessibleResourcesQuery,
    useGetComponentsQuery,
    useGetProjectsQuery,
    useLazyGetTokensQuery,
    useRefreshTokensMutation,
} from "../jiraApi";

let getTokensRequestInitialized = false;

export function Auth() {
    const history = useHistory();
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const accessToken = useAppSelector(selectJiraAccessToken);
    const accessTokenStr = useAppSelector(selectJiraAccessTokenData);
    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const { jira: jiraSettings } = useAppSelector(selectProjectSettings);
    const [error, setError] = useState("");

    const [getTokens, { data: tokensResponse, error: tokensError }] = useLazyGetTokensQuery();
    const [refreshTokens] = useRefreshTokensMutation();

    const { data: accessibleResources, error: accessibleResourcesError } = useGetAccessibleResourcesQuery(
        { accessToken: accessTokenStr },
        { skip: !accessTokenStr }
    );

    const { data: projects, error: projectsError } = useGetProjectsQuery(
        { space: space?.id ?? "", accessToken: accessTokenStr },
        { skip: !space || !accessToken }
    );

    const { data: components, error: componentsError } = useGetComponentsQuery(
        { space: space?.id ?? "", project: project?.key ?? "", accessToken: accessTokenStr },
        { skip: !space || !accessToken || !project }
    );

    useEffect(() => {
        tryAuthenticating();

        async function tryAuthenticating() {
            // todo keepalive
            const code = new URLSearchParams(window.location.search).get("code");
            const refreshToken = getFromStorage(StorageKey.JiraRefreshToken);

            if (getTokensRequestInitialized) {
                return;
            } else if (code) {
                window.history.replaceState(null, "", window.location.pathname);
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Loading }));
                getTokensRequestInitialized = true;
                getTokens({ code });
            } else if (refreshToken) {
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Loading }));

                const res = await refreshTokens({ refreshToken });

                if ("data" in res) {
                    saveToStorage(StorageKey.JiraRefreshToken, res.data.refresh_token);
                    dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.access_token }));
                } else {
                    console.warn(res.error);
                    deleteFromStorage(StorageKey.JiraRefreshToken);
                    history.push("/login");
                }
            } else {
                history.push("/login");
            }
        }
    }, [getTokens, dispatch, history, refreshTokens]);

    useEffect(() => {
        if (accessToken.status !== AsyncStatus.Loading || !(tokensResponse || tokensError)) {
            return;
        }

        if (tokensResponse) {
            dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: tokensResponse.access_token }));
            saveToStorage(StorageKey.JiraRefreshToken, tokensResponse.refresh_token);
        } else {
            console.warn(tokensError);
            dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Error, msg: "An error occured." }));
        }
    }, [accessToken, tokensResponse, tokensError, dispatch]);

    useEffect(() => {
        if (!accessibleResources || space) {
            return;
        }

        const _space = accessibleResources.find((resource) => resource.name === jiraSettings?.space.toLowerCase());

        if (_space) {
            dispatch(jiraActions.setSpace(_space));
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!jiraSettings.space) {
            setError(`Jira has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${jiraSettings?.space} Jira space.`);
        }
    }, [accessibleResources, history, isAdmin, dispatch, jiraSettings, space]);

    useEffect(() => {
        if (!projects || project) {
            return;
        }

        const _project = projects.find((project) => project.key === jiraSettings?.project);

        if (_project) {
            dispatch(jiraActions.setProject(_project));
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!jiraSettings.project) {
            setError(`Jira has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${jiraSettings?.project} Jira project.`);
        }
    }, [projects, history, isAdmin, dispatch, jiraSettings, project]);

    useEffect(() => {
        if (!components || component) {
            return;
        }

        const _component = components.find((component) => component.name === jiraSettings?.component);

        if (_component) {
            dispatch(jiraActions.setComponent(_component));
            history.push("/issues");
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!jiraSettings.component) {
            setError(`Jira has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${jiraSettings?.component} Jira component.`);
        }
    }, [components, history, isAdmin, dispatch, jiraSettings, component]);

    useEffect(() => {
        if (error || !(accessibleResourcesError || projectsError || componentsError)) {
            return;
        }

        const kind = accessibleResourcesError ? "spaces" : projectsError ? "projects" : "components";
        setError(`An error occured while loading Jira ${kind}.`);
    }, [accessibleResourcesError, projectsError, componentsError, error]);

    if (error) {
        return <ErrorMsg>{error}</ErrorMsg>;
    } else if (accessToken.status === AsyncStatus.Error) {
        return <ErrorMsg>{accessToken.msg}</ErrorMsg>;
    } else {
        return <LinearProgress />;
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
