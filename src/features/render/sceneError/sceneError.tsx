import { Alert, Box, CircularProgress, Paper, Typography, useTheme } from "@mui/material";
import { packageVersion as webglApiVersion } from "@novorender/api";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { selectSceneStatus } from "..";
import { ErrorKind } from "./types";

export function SceneError() {
    const theme = useTheme();
    const sceneId = useSceneId();
    const status = useAppSelector(selectSceneStatus);

    if (status.status !== AsyncStatus.Error) {
        return null;
    }

    const { msg: error, stack } = status;

    const loginUrl = `${window.location.origin}/login/${sceneId}${window.location.search}`;
    if (error === ErrorKind.NOT_AUTHORIZED) {
        window.location.replace(
            loginUrl +
                (window.location.search
                    ? window.location.search.includes("force-login=true")
                        ? ""
                        : "&force-login=true"
                    : "?force-login=true")
        );
    }

    return (
        <Box
            bgcolor={theme.palette.secondary.main}
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={"100vh"}
        >
            {error === ErrorKind.NOT_AUTHORIZED ? (
                <CircularProgress />
            ) : (
                <Paper sx={{ minWidth: 320, maxWidth: `min(600px, 90%)`, wordBreak: "break-word", p: 2 }}>
                    <Box>
                        <Typography paragraph variant="h4" component="h1" align="center">
                            {error === ErrorKind.UNKNOWN_ERROR
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
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
