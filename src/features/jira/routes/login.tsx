import { useTheme, Box, Button, Typography } from "@mui/material";

import { ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { createOAuthStateString } from "utils/auth";

export function Login({ sceneId }: { sceneId: string }) {
    const theme = useTheme();

    const handleLoginRedirect = () => {
        const state = createOAuthStateString({
            service: featuresConfig.jira.key,
            sceneId,
        });

        // todo client id
        window.location.href = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=1dwQbCcKFq8CIyHhWzLQIZJNlMxaD8qj&scope=offline_access%20read%3Ajira-work%20manage%3Ajira-project%20manage%3Ajira-configuration%20read%3Ajira-user%20write%3Ajira-work%20manage%3Ajira-webhook%20manage%3Ajira-data-provider&redirect_uri=https%3A%2F%2Flocalhost%3A3000&state=${state}&response_type=code&prompt=consent`;
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
                    <Button sx={{ mt: 4, mb: 2 }} variant="contained" size="large" onClick={handleLoginRedirect}>
                        Log in to Jira
                    </Button>
                </Box>
                <Typography textAlign={"center"} color={theme.palette.text.secondary}>
                    Redirects to Jira login page outside of Novorender.
                </Typography>
            </ScrollBox>
        </>
    );
}
