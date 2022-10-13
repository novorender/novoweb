import { useEffect } from "react";
import { Redirect } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { AsyncStatus } from "types/misc";
import { selectProjectSettings } from "slices/renderSlice";
import { deleteFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";

import { jiraActions, selectJiraSpace, selectJiraAccessToken, selectOAuthCode } from "../jiraSlice";
import { useGetAccessibleResourcesMutation, useGetTokenMutation } from "../jiraApi";

let codeExhangeInitialisedAt = 0;

export function Auth() {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector(selectJiraAccessToken);
    const code = useAppSelector(selectOAuthCode);
    const space = useAppSelector(selectJiraSpace);
    const { jiraSpace } = useAppSelector(selectProjectSettings);

    const [getToken] = useGetTokenMutation();
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
                saveToStorage(StorageKey.JiraAccessToken, res.data.access_token);
            } else {
                console.warn(res.error);
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Error, msg: "An error occured." }));
            }
        }
    }, [code, getToken, dispatch]);

    useEffect(() => {
        initCloudId();

        async function initCloudId() {
            if (space.status !== AsyncStatus.Initial || accessToken.status !== AsyncStatus.Success) {
                return;
            }

            dispatch(jiraActions.setCloudId({ status: AsyncStatus.Loading }));
            const res = await getAccessibleResources({ accessToken: accessToken.data });

            if ("data" in res) {
                const space = res.data.find((resource) => resource.name === jiraSpace.toLowerCase());

                if (space) {
                    dispatch(jiraActions.setCloudId({ status: AsyncStatus.Success, data: space }));
                } else {
                    dispatch(
                        jiraActions.setCloudId({
                            status: AsyncStatus.Error,
                            msg: `You do not have access to the ${jiraSpace} jira space.`,
                        })
                    );
                }
            } else {
                console.warn(res.error);
                dispatch(jiraActions.setCloudId({ status: AsyncStatus.Error, msg: "An error occurred." }));
                deleteFromStorage(StorageKey.JiraAccessToken);
            }
        }
    }, [space, accessToken, getAccessibleResources, jiraSpace, dispatch]);

    if (space.status === AsyncStatus.Success) {
        return <Redirect to="/tasks" />;
    } else if (accessToken.status === AsyncStatus.Initial && !code) {
        return <Redirect to="/login" />;
    } else if (space.status === AsyncStatus.Error) {
        return <ErrorMsg>{space.msg}</ErrorMsg>;
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
