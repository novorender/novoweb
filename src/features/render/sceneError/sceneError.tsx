import { LoadingButton } from "@mui/lab";
import { Alert, Box, CircularProgress, Paper, Typography, useTheme } from "@mui/material";
import { packageVersion as webglApiVersion } from "@novorender/api";
import { useCallback, useEffect, useState } from "react";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { dataServerBaseUrl } from "config/app";
import { StorageKey } from "config/storage";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { AsyncStatus } from "types/misc";
import { createOAuthStateString, generateCodeChallenge } from "utils/auth";
import { deleteFromStorage, saveToStorage } from "utils/storage";

import { selectSceneStatus } from "..";
import { ErrorKind } from "./types";

export function SceneError() {
    const theme = useTheme();
    const sceneId = useSceneId();
    const status = useAppSelector(selectSceneStatus);
    const user = useAppSelector(selectUser);
    const [loading, setLoading] = useState(false);
    const redirect = status.status === AsyncStatus.Error && status.msg === ErrorKind.NOT_AUTHORIZED && !user;

    const loginRedirect = useCallback(
        async (forceLogin?: boolean) => {
            const tenant = await fetch(`${dataServerBaseUrl}/scenes/${sceneId}`)
                .then((res) => res.json())
                .then((res) => ("tenant" in res ? res.tenant : undefined))
                .catch((_err) => undefined);

            const state = createOAuthStateString({
                sceneId,
                service: "self",
                query: window.location.search,
            });

            const [verifier, challenge] = await generateCodeChallenge();
            saveToStorage(StorageKey.CodeVerifier, verifier);

            const loginUrl =
                "https://auth.novorender.com" +
                `/auth` +
                "?response_type=code" +
                `&client_id=${"IWOHeLxNRxoqGtVZ3I6guPo2UvZ6mI5n"}` +
                `&redirect_uri=${window.location.origin}` +
                `&state=${state}` +
                `&code_challenge=${challenge}` +
                `&code_challenge_method=S256` +
                (tenant ? `&tenant_id=${tenant}` : "");

            if (forceLogin) {
                window.location.assign(
                    `https://auth.novorender.com/signout?return_url=${encodeURIComponent(loginUrl)}`
                );
            } else {
                window.location.assign(loginUrl);
            }
        },
        [sceneId]
    );

    useEffect(
        function handleRedirect() {
            if (!redirect) {
                return;
            }

            setLoading(true);
            loginRedirect();
        },
        [redirect, sceneId, loginRedirect]
    );

    const switchUser = () => {
        setLoading(true);
        deleteFromStorage(StorageKey.RefreshToken);
        loginRedirect(true);
    };

    if (status.status !== AsyncStatus.Error) {
        return null;
    }

    const { msg: error, stack } = status;

    return (
        <Box
            bgcolor={theme.palette.secondary.main}
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={"100vh"}
        >
            {redirect ? (
                <CircularProgress />
            ) : (
                <Paper sx={{ minWidth: 320, maxWidth: `min(600px, 90%)`, wordBreak: "break-word", p: 2 }}>
                    <Box>
                        <Typography paragraph variant="h4" component="h1" align="center">
                            {error === ErrorKind.NOT_AUTHORIZED
                                ? "Unable to access scene"
                                : error === ErrorKind.UNKNOWN_ERROR
                                ? "An error occurred"
                                : error === ErrorKind.OFFLINE_UNAVAILABLE
                                ? `Offline scene not found`
                                : error === ErrorKind.INVALID_SCENE
                                ? `Scene not found`
                                : error === ErrorKind.DELETED_SCENE
                                ? "Deleted scene"
                                : "Unable to load scene"}
                        </Typography>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {error === ErrorKind.NOT_AUTHORIZED && user && (
                                <>
                                    You are currently logged in as <em>{user.user}</em> and do not have acces to the
                                    scene with id <em>{sceneId}</em>.
                                </>
                            )}
                            {error === ErrorKind.LEGACY_BINARY_FORMAT && (
                                <>There is an issue with this scene. Please contact support.</>
                            )}
                            {error === ErrorKind.UNKNOWN_ERROR && (
                                <>
                                    Failed to download the scene. Please try again later.
                                    <br />
                                    <br />
                                    Make sure you are using an up to date version of either Safari or a Chromium based
                                    browser such as Chrome or Edge.
                                </>
                            )}
                            {error === ErrorKind.OFFLINE_UNAVAILABLE && (
                                <>
                                    The scene with id <em>{sceneId}</em> has not been downloaded for your device and
                                    browser.
                                </>
                            )}
                            {error === ErrorKind.INVALID_SCENE && (
                                <>
                                    The scene with id <em>{sceneId}</em> does not exist.
                                </>
                            )}
                            {error === ErrorKind.DELETED_SCENE && (
                                <>
                                    The scene has been deleted. If this was done by mistake please contact support and
                                    we will try to recover it.
                                </>
                            )}
                        </Alert>

                        {error === ErrorKind.NOT_AUTHORIZED && user ? (
                            <Box display={"flex"} justifyContent="center">
                                <LoadingButton
                                    onClick={() => {
                                        switchUser();
                                    }}
                                    sx={{ mt: 3, mb: 2, minWidth: 250 }}
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    loading={loading}
                                    loadingIndicator={
                                        <Box position={"relative"} display="flex" alignItems="center" minWidth={75}>
                                            Switch user
                                            <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                                        </Box>
                                    }
                                >
                                    Switch user
                                </LoadingButton>
                            </Box>
                        ) : (
                            <Accordion>
                                <AccordionSummary>Details</AccordionSummary>
                                <AccordionDetails>
                                    <Box p={1}>
                                        <>
                                            Timestamp: {new Date().toISOString()} <br />
                                            API: {webglApiVersion} <br />
                                            Dataserver: {(dataApi as { serviceUrl?: string })?.serviceUrl}
                                            {stack ? (
                                                <Box mt={2}>
                                                    ERROR: <br />
                                                    {stack}
                                                </Box>
                                            ) : null}
                                        </>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        )}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
