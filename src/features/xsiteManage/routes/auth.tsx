import { useEffect, useState } from "react";
import { Redirect, useHistory } from "react-router-dom";
import { Box, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";

import { selectXsiteManageAccessToken, selectXsiteManageSite, xsiteManageActions } from "../slice";
import { useGetSitesQuery, useLazyGetTokensQuery, useRefreshTokensMutation } from "../api";
import { featuresConfig } from "config/features";
import { selectProjectSettings } from "slices/renderSlice";
import { selectHasAdminCapabilities } from "slices/explorerSlice";

let getTokensRequestInitialized = false;

export function Auth() {
    const history = useHistory();
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const accessToken = useAppSelector(selectXsiteManageAccessToken);
    const site = useAppSelector(selectXsiteManageSite);
    const { xsiteManage: xsiteManageSettings } = useAppSelector(selectProjectSettings);
    const [error, setError] = useState("");

    const [getTokens, { data: tokensResponse, error: tokensError }] = useLazyGetTokensQuery();
    const [refreshTokens] = useRefreshTokensMutation();

    const { data: sites, error: sitesError } = useGetSitesQuery(undefined, {
        skip: accessToken.status !== AsyncStatus.Success,
    });

    useEffect(() => {
        tryAuthenticating();

        async function tryAuthenticating() {
            if (accessToken.status !== AsyncStatus.Initial) {
                return;
            }

            const code = new URLSearchParams(window.location.search).get("code");
            const storedRefreshToken = getFromStorage(StorageKey.XsiteManageRefreshToken);

            if (getTokensRequestInitialized) {
                return;
            } else if (code) {
                window.history.replaceState(null, "", window.location.pathname);
                dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Loading }));
                getTokensRequestInitialized = true;
                getTokens({ code });
            } else if (storedRefreshToken) {
                try {
                    const refreshToken = JSON.parse(storedRefreshToken) as { token: string; expires: number };

                    if (refreshToken.expires < Date.now() - 1000 * 60 * 60 * 12) {
                        throw new Error("Xsite Manage refresh token has expired.");
                    }

                    dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Loading }));

                    const res = await refreshTokens({ refreshToken: refreshToken.token });

                    if ("data" in res) {
                        dispatch(
                            xsiteManageActions.setAccessToken({
                                status: AsyncStatus.Success,
                                data: res.data.id_token,
                            })
                        );
                        dispatch(
                            xsiteManageActions.setRefreshToken({
                                token: refreshToken.token,
                                refreshIn: res.data.expires_in,
                            })
                        );
                    } else {
                        throw res.error;
                    }
                } catch (e) {
                    console.warn(e);
                    deleteFromStorage(StorageKey.XsiteManageRefreshToken);
                    dispatch(xsiteManageActions.setRefreshToken(undefined));
                    history.push("/login");
                }
            } else {
                history.push("/login");
            }
        }
    }, [accessToken, getTokens, dispatch, history, refreshTokens]);

    useEffect(() => {
        if (accessToken.status !== AsyncStatus.Loading || !(tokensResponse || tokensError)) {
            return;
        }

        if (tokensResponse) {
            dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Success, data: tokensResponse.id_token }));
            saveToStorage(
                StorageKey.XsiteManageRefreshToken,
                JSON.stringify({
                    token: tokensResponse.refresh_token,
                    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
                })
            );
        } else {
            console.warn(tokensError);
            dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Error, msg: "An error occurred." }));
        }
    }, [accessToken, tokensResponse, tokensError, dispatch]);

    useEffect(() => {
        if (!sites || site) {
            return;
        }

        const _site = sites.items.find((site) => site.siteId === xsiteManageSettings?.siteId);

        if (_site) {
            dispatch(xsiteManageActions.setSite(_site));
        } else if (isAdmin) {
            history.push("/settings");
        } else if (!xsiteManageSettings.siteId) {
            setError(`${featuresConfig.xsiteManage.name} has not yet been set up for this project.`);
        } else {
            setError(
                `You do not have access to the ${xsiteManageSettings.siteId} ${featuresConfig.xsiteManage.name} site.`
            );
        }
    }, [sites, history, isAdmin, dispatch, xsiteManageSettings, site]);

    return site ? (
        <Redirect to="/machines" />
    ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
    ) : sitesError || tokensError || accessToken.status === AsyncStatus.Error ? (
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
