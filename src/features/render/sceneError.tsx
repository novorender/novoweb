import { Alert, Box, CircularProgress, Paper, Typography, useTheme } from "@mui/material";
import { packageVersion as webglApiVersion } from "@novorender/api";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { selectSceneStatus } from ".";

export enum Error {
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    INVALID_SCENE = "INVALID_SCENE",
    DELETED_SCENE = "DELETED_SCENE",
    NOT_AUTHORIZED = "NOT_AUTHORIZED",
    LEGACY_BINARY_FORMAT = "LEGACY_BINARY_FORMAT",
}

export function SceneError() {
    const theme = useTheme();
    const sceneId = useSceneId();
    const status = useAppSelector(selectSceneStatus);

    if (status.status !== AsyncStatus.Error) {
        return null;
    }

    const { msg: error, stack } = status;

    const loginUrl = `${window.location.origin}/login/${sceneId}${window.location.search}`;
    if (error === Error.NOT_AUTHORIZED) {
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
            {error === Error.NOT_AUTHORIZED ? (
                <CircularProgress />
            ) : (
                <Paper sx={{ minWidth: 320, maxWidth: `min(600px, 90%)`, wordBreak: "break-word", p: 2 }}>
                    <Box>
                        <Typography paragraph variant="h4" component="h1" align="center">
                            {error === Error.UNKNOWN_ERROR
                                ? "An error occurred"
                                : error === Error.INVALID_SCENE
                                ? `Scene not found`
                                : error === Error.DELETED_SCENE
                                ? "Deleted scene"
                                : "Unable to load scene"}
                        </Typography>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {error === Error.UNKNOWN_ERROR && (
                                <>
                                    Make sure you are using an up to date version of either Safari or a Chromium based
                                    browser such as Chrome or Edge.
                                </>
                            )}
                            {error === Error.LEGACY_BINARY_FORMAT && (
                                <>
                                    This scene needs to be updated. An admin can{" "}
                                    <a href="https://novorender.com/manuals/update-scene/">
                                        follow the steps shown here
                                    </a>{" "}
                                    to update the scene. The process may take a few minutes to complete. <br /> <br />
                                    Please get in touch with support if you are still seeing this error after updating
                                    the scene.
                                </>
                            )}
                            {error === Error.UNKNOWN_ERROR && (
                                <>"Failed to download the scene. Please try again later.</>
                            )}
                            {error === Error.INVALID_SCENE && (
                                <>
                                    The scene with id <em>{sceneId}</em> does not exist.
                                </>
                            )}
                            {error === Error.DELETED_SCENE && (
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
                                        Dataserver: {(dataApi as any).serviceUrl}
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
