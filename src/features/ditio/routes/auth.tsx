import { useEffect, useState } from "react";
import { Redirect, useHistory } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";
import { featuresConfig } from "config/features";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { selectProjectSettings } from "slices/renderSlice";

import { selectAccessToken, ditioActions, selectDitioProject } from "../slice";
import { useGetAuthConfigQuery, useGetProjectsQuery, useLazyGetTokensQuery, useRefreshTokensMutation } from "../api";

let getTokensRequestInitialized = false;

export function Auth() {
    const history = useHistory();
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const accessToken = useAppSelector(selectAccessToken);
    const project = useAppSelector(selectDitioProject);
    const { ditioProjectNumber } = useAppSelector(selectProjectSettings);
    const [error, setError] = useState("");

    const { data: authConfig } = useGetAuthConfigQuery();
    const [refreshTokens] = useRefreshTokensMutation();
    const [getTokens, { data: tokensResponse, error: tokensError }] = useLazyGetTokensQuery();
    const { data: projects, isError: projectsError } = useGetProjectsQuery(undefined, {
        skip: accessToken.status !== AsyncStatus.Success,
    });

    useEffect(() => {
        tryAuthenticating();

        async function tryAuthenticating() {
            if (!authConfig || accessToken.status !== AsyncStatus.Initial) {
                return;
            }

            const code = new URLSearchParams(window.location.search).get("code");
            const storedRefreshToken = getFromStorage(StorageKey.DitioRefreshToken);

            if (getTokensRequestInitialized) {
                return;
            } else if (code) {
                window.history.replaceState(null, "", window.location.pathname);
                dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Loading }));
                getTokensRequestInitialized = true;
                getTokens({ tokenEndpoint: authConfig.token_endpoint, code });
            } else if (storedRefreshToken) {
                try {
                    const refreshToken = JSON.parse(storedRefreshToken) as { token: string; expires: number };

                    if (refreshToken.expires < Date.now() - 1000 * 60 * 60 * 12) {
                        throw new Error(`${featuresConfig.ditio.name} refresh token has expired.`);
                    }

                    dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Loading }));

                    const res = await refreshTokens({
                        tokenEndpoint: authConfig.token_endpoint,
                        refreshToken: refreshToken.token,
                    });

                    if ("data" in res) {
                        dispatch(
                            ditioActions.setAccessToken({
                                status: AsyncStatus.Success,
                                data: res.data.access_token,
                            })
                        );
                        dispatch(
                            ditioActions.setRefreshToken({
                                token: res.data.refresh_token,
                                refreshIn: res.data.expires_in,
                            })
                        );
                        saveToStorage(
                            StorageKey.DitioRefreshToken,
                            JSON.stringify({ token: res.data.refresh_token, expires: refreshToken.expires })
                        );
                    } else {
                        throw res.error;
                    }
                } catch (e) {
                    console.warn(e);
                    deleteFromStorage(StorageKey.DitioRefreshToken);
                    dispatch(ditioActions.setRefreshToken(undefined));
                    history.push("/login");
                }
            } else {
                history.push("/login");
            }
        }
    }, [accessToken, getTokens, dispatch, history, refreshTokens, authConfig]);

    useEffect(() => {
        if (accessToken.status !== AsyncStatus.Loading || !(tokensResponse || tokensError)) {
            return;
        }

        if (tokensResponse) {
            dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Success, data: tokensResponse.access_token }));
            saveToStorage(
                StorageKey.DitioRefreshToken,
                JSON.stringify({
                    token: tokensResponse.refresh_token,
                    expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
                })
            );
        } else {
            console.warn(tokensError);
            dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Error, msg: "An error occurred." }));
        }
    }, [accessToken, tokensResponse, tokensError, dispatch]);

    useEffect(() => {
        if (!projects || project) {
            return;
        }

        const _project = projects.find((proj) => proj.projectNumber === ditioProjectNumber);

        if (_project) {
            dispatch(ditioActions.setProject(_project));
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!ditioProjectNumber) {
            setError(`${featuresConfig.ditio.name} has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${ditioProjectNumber} ${featuresConfig.ditio.name} site.`);
        }
    }, [projects, project, history, isAdmin, dispatch, ditioProjectNumber]);

    return project ? (
        <Redirect to="/feed" />
    ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
    ) : projectsError || tokensError || accessToken.status === AsyncStatus.Error ? (
        <ErrorMsg>An error occurred.</ErrorMsg>
    ) : (
        <LinearProgress />
    );
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
