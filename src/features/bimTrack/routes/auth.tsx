import { Box, Typography } from "@mui/material";
import { useEffect } from "react";
import { Redirect, useHistory } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LinearProgress, ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { StorageKey } from "config/storage";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { selectConfig, selectHasAdminCapabilities } from "slices/explorer";
import { AsyncStatus, hasFinished } from "types/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";

import { useLazyGetTokenQuery, useLazyRefreshTokenQuery } from "../bimTrackApi";
import { bimTrackActions, selectAccessToken, selectBimTrackConfig } from "../bimTrackSlice";

let getTokensRequestInitialized = false;
export function Auth() {
    const history = useHistory();
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();
    const explorerConfig = useAppSelector(selectConfig);
    const config = useAppSelector(selectBimTrackConfig);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.IntBimTrackManage) ?? isAdmin;

    const [getToken] = useLazyGetTokenQuery();
    const [refreshToken] = useLazyRefreshTokenQuery();

    useEffect(() => {
        tryAuthenticating();

        async function tryAuthenticating() {
            if (accessToken.status !== AsyncStatus.Initial) {
                return;
            }

            const storedRefreshToken = getFromStorage(StorageKey.BimTrackRefreshToken);
            const code = new URLSearchParams(window.location.search).get("code");

            if (getTokensRequestInitialized) {
                return;
            } else if (code) {
                getTokensRequestInitialized = true;
                window.history.replaceState(null, "", window.location.pathname.replace("Callback", ""));
                dispatch(bimTrackActions.setAccessToken({ status: AsyncStatus.Loading }));

                const res = await getToken({ code, config: explorerConfig })
                    .unwrap()
                    .catch((e) => {
                        console.warn(`${featuresConfig.bimTrack.name} authentication failed`, e);
                        return undefined;
                    });

                if (!res) {
                    dispatch(
                        bimTrackActions.setAccessToken({
                            status: AsyncStatus.Error,
                            msg: `An error occurred while authenticating with ${featuresConfig.bimTrack.name}`,
                        })
                    );
                    return;
                }

                if (res.refresh_token) {
                    saveToStorage(StorageKey.BimTrackRefreshToken, res.refresh_token);
                }

                dispatch(
                    bimTrackActions.setAccessToken({
                        status: AsyncStatus.Success,
                        data: res.access_token,
                    })
                );

                return res.access_token;
            } else if (storedRefreshToken) {
                const res = await refreshToken({
                    config: explorerConfig,
                    refreshToken: storedRefreshToken,
                })
                    .unwrap()
                    .catch((e) => {
                        console.warn(e);
                        return undefined;
                    });

                if (!res) {
                    history.replace("/login");
                    return;
                }

                if (res.refresh_token) {
                    saveToStorage(StorageKey.BimTrackRefreshToken, res.refresh_token);
                } else {
                    deleteFromStorage(StorageKey.BimTrackRefreshToken);
                }

                dispatch(
                    bimTrackActions.setAccessToken({
                        status: AsyncStatus.Success,
                        data: res.access_token,
                    })
                );
            } else {
                history.replace("/login");
            }
        }
    }, [accessToken, dispatch, explorerConfig, getToken, history, refreshToken]);

    return !hasFinished(accessToken) ? (
        <Box position="relative">
            <LinearProgress />
        </Box>
    ) : accessToken.status === AsyncStatus.Error ? (
        <ErrorMsg>{accessToken.msg}</ErrorMsg>
    ) : !(config.project && config.server) ? (
        canManage ? (
            <Redirect to="/settings" />
        ) : (
            <ErrorMsg>{`${featuresConfig.bimTrack.name} has not yet been set up for this project.`}</ErrorMsg>
        )
    ) : (
        <Redirect to={`/${config.project}/topics`} />
    );
}

function ErrorMsg({ children }: { children: string }) {
    return (
        <>
            <Box
                boxShadow={(theme) => theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1}>
                <Typography>{children}</Typography>
            </ScrollBox>
        </>
    );
}
