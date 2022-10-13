import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { AsyncStatus } from "types/misc";
import { selectProjectSettings } from "slices/renderSlice";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";

import {
    jiraActions,
    selectJiraSpace,
    selectJiraAccessToken,
    selectOAuthCode,
    selectAvailableJiraSpaces,
} from "../jiraSlice";
import { useGetAccessibleResourcesMutation, useGetTokenMutation, useRefreshTokensMutation } from "../jiraApi";
import { selectHasAdminCapabilities } from "slices/explorerSlice";

let codeExhangeInitialisedAt = 0;

export function Auth() {
    const history = useHistory();
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const accessToken = useAppSelector(selectJiraAccessToken);
    const code = useAppSelector(selectOAuthCode);
    const space = useAppSelector(selectJiraSpace);
    const availableSpaces = useAppSelector(selectAvailableJiraSpaces);
    const { jira: jiraSettings } = useAppSelector(selectProjectSettings);

    const [getToken] = useGetTokenMutation();
    const [refreshTokens] = useRefreshTokensMutation();
    const [getAccessibleResources] = useGetAccessibleResourcesMutation();

    useEffect(() => {
        exchangeCodeForToken();

        async function exchangeCodeForToken() {
            const now = Date.now();

            // NOTE(OLA): React strict mode double mounts quicker than any store updates.
            // Attempting to exchange twice results in a race condition.
            if (!code || now - codeExhangeInitialisedAt < 3000) {
                return;
            }

            codeExhangeInitialisedAt = now;
            dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Loading }));
            dispatch(jiraActions.deleteOAuthCode());
            const res = await getToken({ code });

            if ("data" in res) {
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.access_token }));
                saveToStorage(StorageKey.JiraRefreshToken, res.data.refresh_token);
            } else {
                console.warn(res.error);
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Error, msg: "An error occured." }));
            }
        }
    }, [code, getToken, dispatch]);

    useEffect(() => {
        initRefreshTokens();

        async function initRefreshTokens() {
            const refreshToken = getFromStorage(StorageKey.JiraRefreshToken);

            if (code || accessToken.status !== AsyncStatus.Initial) {
                return;
            }

            if (!refreshToken) {
                history.push("/login");
                return;
            }

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
        }
    }, [code, accessToken, refreshTokens, dispatch, history]);

    useEffect(() => {
        initAccessibleResources();

        async function initAccessibleResources() {
            if (availableSpaces.status === AsyncStatus.Success) {
                if (!jiraSettings?.space && isAdmin) {
                    history.push("/settings");
                } else {
                    history.push("/tasks");
                }

                return;
            }

            if (availableSpaces.status !== AsyncStatus.Error && !jiraSettings?.space && !isAdmin) {
                dispatch(
                    jiraActions.setAvailableSpaces({
                        status: AsyncStatus.Error,
                        msg: "Jira has not yet been set up for this project.",
                    })
                );
                return;
            }

            if (availableSpaces.status !== AsyncStatus.Initial || accessToken.status !== AsyncStatus.Success) {
                return;
            }

            dispatch(jiraActions.setAvailableSpaces({ status: AsyncStatus.Loading }));
            const res = await getAccessibleResources({ accessToken: accessToken.data });

            if ("data" in res) {
                dispatch(jiraActions.setAvailableSpaces({ status: AsyncStatus.Success, data: res.data }));

                if (!jiraSettings?.space && isAdmin) {
                    history.push("/settings");
                    return;
                }

                const space = res.data.find((resource) => resource.name === jiraSettings?.space.toLowerCase());

                if (space) {
                    dispatch(jiraActions.setSpace(space));
                    history.push("/tasks");
                } else {
                    dispatch(
                        jiraActions.setAvailableSpaces({
                            status: AsyncStatus.Error,
                            msg: `You do not have access to the ${jiraSettings?.space} jira space.`,
                        })
                    );
                }
            } else {
                console.warn(res.error);
                dispatch(jiraActions.setAvailableSpaces({ status: AsyncStatus.Error, msg: "An error occurred." }));
            }
        }
    }, [space, accessToken, getAccessibleResources, jiraSettings, dispatch, history, availableSpaces, isAdmin]);

    if (availableSpaces.status === AsyncStatus.Error) {
        return <ErrorMsg>{availableSpaces.msg}</ErrorMsg>;
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
