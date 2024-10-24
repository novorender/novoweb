import { LoadingButton } from "@mui/lab";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { selectConfig } from "slices/explorer";
import { createOAuthStateString } from "utils/auth";

import { jiraIdentityServer } from "../jiraApi";

export function Login({ sceneId }: { sceneId: string }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const createBookmark = useCreateBookmark();
    const config = useAppSelector(selectConfig);

    const handleLoginRedirect = () => {
        const id = window.crypto.randomUUID();
        const state = createOAuthStateString({
            sceneId,
            service: featuresConfig.jira.key,
            localBookmarkId: id,
        });

        const bm = createBookmark();

        try {
            localStorage.setItem(id, JSON.stringify(bm));
        } catch {
            // nada
        }

        setLoading(true);

        window.location.href =
            jiraIdentityServer +
            "?audience=api.atlassian.com" +
            `&client_id=${config.jiraClientId}` +
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
                                {t("logInToJira")}
                                <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        {t("logInToJira")}
                    </LoadingButton>
                </Box>
                <Typography textAlign={"center"} color={theme.palette.text.secondary}>
                    {t("redirectsToJira")}
                </Typography>
            </ScrollBox>
        </>
    );
}
