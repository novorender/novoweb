import { LoadingButton } from "@mui/lab";
import { Alert, Box, CircularProgress, Paper, Typography, useTheme } from "@mui/material";
import { packageVersion as webglApiVersion } from "@novorender/api";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { dataApi } from "apis/dataV1";
import { useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { StorageKey } from "config/storage";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { selectConfig } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { createOAuthStateString, generateCodeChallenge } from "utils/auth";
import { deleteFromStorage, saveToStorage } from "utils/storage";

import { selectSceneStatus } from "../renderSlice";
import { ErrorKind } from "./types";

export function SceneError() {
    const { t } = useTranslation();
    const theme = useTheme();
    const sceneId = useSceneId();
    const status = useAppSelector(selectSceneStatus);
    const user = useAppSelector(selectUser);
    const config = useAppSelector(selectConfig);
    const [loading, setLoading] = useState(false);
    const redirect = status.status === AsyncStatus.Error && status.msg === ErrorKind.NOT_AUTHORIZED && !user;

    const loginRedirect = useCallback(
        async (forceLogin?: boolean) => {
            const tenant = await fetch(`${dataApi.serviceUrl}/scenes/${sceneId}`)
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
                config.authServerUrl +
                `/auth` +
                "?response_type=code" +
                `&client_id=${config.novorenderClientId}` +
                `&redirect_uri=${window.location.origin}` +
                `&state=${state}` +
                `&code_challenge=${challenge}` +
                `&code_challenge_method=S256` +
                (tenant ? `&tenant_id=${tenant}` : "");

            if (forceLogin) {
                window.location.assign(`${config.authServerUrl}/signout?return_url=${encodeURIComponent(loginUrl)}`);
            } else {
                window.location.assign(loginUrl);
            }
        },
        [sceneId, config],
    );

    useEffect(
        function handleRedirect() {
            if (!redirect) {
                return;
            }

            setLoading(true);
            loginRedirect();
        },
        [redirect, sceneId, loginRedirect],
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
                                    {t("youAreCurrentlyLoggedInAs")}
                                    <em>{user.user}</em> {t("andDoNotHaveAccesToTheSceneWithId")}
                                    <em>{sceneId}</em>
                                    {t(".")}
                                </>
                            )}
                            {error === ErrorKind.LEGACY_BINARY_FORMAT && (
                                <>{t("thereIsAnIssueWithThisScene.PleaseContactSupport.")}</>
                            )}
                            {error === ErrorKind.UNKNOWN_ERROR && (
                                <>
                                    {t("failedToDownloadTheScene.PleaseTryAgainLater.")}
                                    <br />
                                    <br />
                                    {t(
                                        "makeSureYouAreUsingAnUpToDateVersionOfEitherSafariOrAChromiumBasedBrowserSuchAsChromeOrEdge.",
                                    )}
                                </>
                            )}
                            {error === ErrorKind.OFFLINE_UNAVAILABLE && (
                                <>
                                    {t("theSceneWithId")}
                                    <em>{sceneId}</em> {t("hasNotBeenDownloadedForYourDeviceAndBrowser.")}
                                </>
                            )}
                            {error === ErrorKind.INVALID_SCENE && (
                                <>
                                    {t("theSceneWithId")}
                                    <em>{sceneId}</em> {t("doesNotExist.")}
                                </>
                            )}
                            {error === ErrorKind.DELETED_SCENE && (
                                <>
                                    {t(
                                        "theSceneHasBeenDeleted.IfThisWasDoneByMistakePleaseContactSupportAndWeWillTryToRecoverIt.",
                                    )}
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
                                            {t("switchUser")}
                                            <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                                        </Box>
                                    }
                                >
                                    {t("switchUser")}
                                </LoadingButton>
                            </Box>
                        ) : (
                            <Accordion>
                                <AccordionSummary>{t("details")}</AccordionSummary>
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
