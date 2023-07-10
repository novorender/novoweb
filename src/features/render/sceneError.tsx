import { Alert, Box, CircularProgress, Paper, Typography, useTheme } from "@mui/material";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { selectSceneStatus } from ".";

export enum Error {
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    INVALID_SCENE = "INVALID_SCENE",
    NOT_AUTHORIZED = "NOT_AUTHORIZED",
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
        // todo
        alert(error);
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
                                : "Unable to load scene"}
                        </Typography>
                        {error === Error.UNKNOWN_ERROR && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Make sure you are using an up to date version of either Safari or a Chromium based
                                browser such as Chrome or Edge.
                            </Alert>
                        )}
                        <Typography paragraph>
                            {error === Error.UNKNOWN_ERROR ? (
                                "Failed to download the scene. Please try again later."
                            ) : error === Error.INVALID_SCENE ? (
                                <>
                                    The scene with id <em>{sceneId}</em> does not exist.
                                </>
                            ) : (
                                <>
                                    You do not have access to the scene <em>{sceneId}</em>.
                                </>
                            )}
                        </Typography>
                        <Accordion>
                            <AccordionSummary>Details</AccordionSummary>
                            <AccordionDetails>
                                <Box p={1}>
                                    <>
                                        Timestamp: {new Date().toISOString()} <br />
                                        API: {"TODO API VERSION"} <br />
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
