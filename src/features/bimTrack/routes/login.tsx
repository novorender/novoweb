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

import { getCode } from "../bimTrackApi";

export function Login({ sceneId }: { sceneId: string }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const createBookmark = useCreateBookmark();
    const config = useAppSelector(selectConfig);

    const handleLoginRedirect = async () => {
        const bookmarkId = window.crypto.randomUUID();
        const state = createOAuthStateString({
            sceneId,
            service: featuresConfig.bimTrack.key,
            localBookmarkId: bookmarkId,
        });

        const bm = createBookmark();

        try {
            sessionStorage.setItem(bookmarkId, JSON.stringify(bm));
        } catch {
            // nada
        }

        setLoading(true);
        getCode(state, config);
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
                        sx={{ mt: 4, mb: 2, minWidth: 200 }}
                        variant="contained"
                        color="primary"
                        size="large"
                        loading={loading}
                        loadingIndicator={
                            <Box position={"relative"} display="flex" alignItems="center" minWidth={220}>
                                {t("logInTo")}
                                {featuresConfig.bimTrack.name}
                                <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        {t("logInTo")}
                        {featuresConfig.bimTrack.name}
                    </LoadingButton>
                </Box>
                <Typography textAlign={"center"} color={theme.palette.text.secondary}>
                    {t("redirectsTo")}
                    {featuresConfig.bimTrack.name} {t("loginPageOutsideOfNovorender.")}
                </Typography>
            </ScrollBox>
        </>
    );
}
