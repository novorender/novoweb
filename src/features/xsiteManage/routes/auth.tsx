import { Box, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Redirect, useHistory } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LinearProgress, ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { StorageKey } from "config/storage";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { selectConfig, selectHasAdminCapabilities } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";

import { useGetSitesQuery, useLazyGetTokensQuery, useRefreshTokensMutation } from "../api";
import {
    selectXsiteManageAccessToken,
    selectXsiteManageConfig,
    selectXsiteManageSite,
    xsiteManageActions,
} from "../slice";

let getTokensRequestInitialized = false;

export function Auth() {
    const { t } = useTranslation();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.IntXsiteManageManage) ?? isAdmin;
    const accessToken = useAppSelector(selectXsiteManageAccessToken);
    const site = useAppSelector(selectXsiteManageSite);
    const config = useAppSelector(selectXsiteManageConfig);
    const explorerConfig = useAppSelector(selectConfig);
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
                getTokens({ code, config: explorerConfig });
            } else if (storedRefreshToken) {
                try {
                    const refreshToken = JSON.parse(storedRefreshToken) as { token: string; expires: number };

                    if (refreshToken.expires < Date.now() - 1000 * 60 * 60 * 12) {
                        throw new Error("Xsite Manage refresh token has expired.");
                    }

                    dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Loading }));

                    const res = await refreshTokens({ refreshToken: refreshToken.token, config: explorerConfig });

                    if ("data" in res) {
                        dispatch(
                            xsiteManageActions.setAccessToken({
                                status: AsyncStatus.Success,
                                data: res.data.id_token,
                            }),
                        );
                        dispatch(
                            xsiteManageActions.setRefreshToken({
                                token: refreshToken.token,
                                refreshIn: res.data.expires_in,
                            }),
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
    }, [accessToken, getTokens, dispatch, history, refreshTokens, explorerConfig]);

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
                }),
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

        const _site = sites.items.find((site) => site.siteId === config?.siteId);

        if (_site) {
            dispatch(xsiteManageActions.setSite(_site));
        } else if (canManage) {
            history.push("/settings");
        } else if (!config.siteId) {
            setError(`${t(featuresConfig.xsiteManage.nameKey)} has not yet been set up for this project.`);
        } else {
            setError(`You do not have access to the ${config.siteId} ${t(featuresConfig.xsiteManage.nameKey)} site.`);
        }
    }, [sites, history, canManage, dispatch, config, site, t]);

    return site ? (
        <Redirect to="/machines" />
    ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
    ) : sitesError || tokensError || accessToken.status === AsyncStatus.Error ? (
        <ErrorMsg>{t("errorOccurred")}</ErrorMsg>
    ) : (
        <Box position="relative">
            <LinearProgress />
        </Box>
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
