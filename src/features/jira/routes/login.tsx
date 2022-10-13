import { useState } from "react";
import { useTheme, Box, Typography, CircularProgress } from "@mui/material";
import { LoadingButton } from "@mui/lab";

import { ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { createOAuthStateString } from "utils/auth";

import { jiraClientId, jiraIdentityServer } from "../jiraApi";

export function Login({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);

    const handleLoginRedirect = () => {
        const state = createOAuthStateString({
            service: featuresConfig.jira.key,
            sceneId,
        });

        setLoading(true);

        window.location.href =
            jiraIdentityServer +
            "?audience=api.atlassian.com" +
            `&client_id=${jiraClientId}` +
            "&scope=offline_access%20read%3Ajira-work%20manage%3Ajira-project%20manage%3Ajira-configuration%20read%3Ajira-user%20write%3Ajira-work%20manage%3Ajira-webhook%20manage%3Ajira-data-provider" +
            `&redirect_uri=${window.location.origin}` +
            `&state=${state}` +
            "&response_type=code" +
            "&prompt=consent";
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1}>
                <Box display="flex" justifyContent="center">
                    <LoadingButton
                        onClick={handleLoginRedirect}
                        type="submit"
                        sx={{ mt: 4, mb: 2, minWidth: 250 }}
                        variant="contained"
                        color="primary"
                        size="large"
                        loading={loading}
                        loadingIndicator={
                            <Box display="flex" alignItems="center">
                                Log in to Jira <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        Log in to Jira
                    </LoadingButton>
                </Box>
                <Typography textAlign={"center"} color={theme.palette.text.secondary}>
                    Redirects to Jira login page outside of Novorender.
                </Typography>
            </ScrollBox>
        </>
    );
}
