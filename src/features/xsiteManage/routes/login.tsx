import { LoadingButton } from "@mui/lab";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { selectConfig } from "slices/explorer";
import { createOAuthStateString } from "utils/auth";

import { xsiteManageAuthServer } from "../api";

export function Login({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const createBookmark = useCreateBookmark();
    const config = useAppSelector(selectConfig);

    const handleLoginRedirect = () => {
        const bookmarkId = window.crypto.randomUUID();
        const state = createOAuthStateString({
            sceneId,
            service: featuresConfig.xsiteManage.key,
            localBookmarkId: bookmarkId,
        });

        const bm = createBookmark();

        try {
            sessionStorage.setItem(bookmarkId, JSON.stringify(bm));
        } catch {
            // nada
        }

        setLoading(true);

        window.location.href =
            xsiteManageAuthServer +
            `/login` +
            "?response_type=code" +
            `&client_id=${config.xsiteManageClientId}` +
            `&redirect_uri=${window.location.origin}` +
            `&state=${state}`;
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
                            <Box position={"relative"} display="flex" alignItems="center" minWidth={190}>
                                Log in to {featuresConfig.xsiteManage.name}
                                <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        Log in to {featuresConfig.xsiteManage.name}
                    </LoadingButton>
                </Box>
                <Typography textAlign={"center"} color={theme.palette.text.secondary}>
                    Redirects to {featuresConfig.xsiteManage.name} login page outside of Novorender.
                </Typography>
            </ScrollBox>
        </>
    );
}
