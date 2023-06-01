import { Box, Paper, Typography, useTheme, CircularProgress, Alert } from "@mui/material";

import { api, dataApi } from "app";
import { Accordion, AccordionDetails, AccordionSummary } from "components";

import { Status } from "./render_OLD";

export function SceneError({ id, error, msg }: { id: string; error: Exclude<Status, Status.Initial>; msg?: string }) {
    const theme = useTheme();
    const loginUrl = `${window.location.origin}/login/${id}${window.location.search}`;

    if (error === Status.AuthError) {
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
            {error === Status.AuthError ? (
                <CircularProgress />
            ) : (
                <Paper sx={{ minWidth: 320, maxWidth: `min(600px, 90%)`, wordBreak: "break-word", p: 2 }}>
                    <Box>
                        <Typography paragraph variant="h4" component="h1" align="center">
                            {error === Status.ServerError
                                ? "An error occurred"
                                : error === Status.NoSceneError
                                ? `Scene not found`
                                : "Unable to load scene"}
                        </Typography>
                        {error === Status.ServerError && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Make sure you are using an up to date version of either Safari or a Chromium based
                                browser such as Chrome or Edge.
                            </Alert>
                        )}
                        <Typography paragraph>
                            {error === Status.ServerError ? (
                                "Failed to download the scene. Please try again later."
                            ) : error === Status.NoSceneError ? (
                                <>
                                    The scene with id <em>{id}</em> does not exist.
                                </>
                            ) : (
                                <>
                                    You do not have access to the scene <em>{id}</em>.
                                </>
                            )}
                        </Typography>
                        <Accordion>
                            <AccordionSummary>Details</AccordionSummary>
                            <AccordionDetails>
                                <Box p={1}>
                                    <>
                                        Timestamp: {new Date().toISOString()} <br />
                                        API: {api.version} <br />
                                        Dataserver: {(dataApi as any).serviceUrl}
                                        {msg ? (
                                            <Box mt={2}>
                                                ERROR: <br />
                                                {msg}
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

export function isSceneError(status: Status): status is Exclude<Status, Status.Initial> {
    return [Status.AuthError, Status.NoSceneError, Status.ServerError].includes(status);
}
