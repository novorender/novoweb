import { useState } from "react";
import { useTheme, Box, Typography, CircularProgress } from "@mui/material";
import { LoadingButton } from "@mui/lab";

import { LinearProgress, ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { createOAuthStateString, generateCodeChallenge } from "utils/auth";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { generateRandomString } from "utils/misc";
import { saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";

import { ditioClientId, useGetAuthConfigQuery } from "../api";

const scope = "openid ditioapiv3 offline_access";

export function Login({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const createBookmark = useCreateBookmark();

    const { data: authConfig, isLoading: isLoadingAuthConfig, isError } = useGetAuthConfigQuery();

    const handleLoginRedirect = async () => {
        const bookmarkId = window.crypto.randomUUID();
        const state = createOAuthStateString({
            sceneId,
            service: featuresConfig.ditio.key,
            localBookmarkId: bookmarkId,
        });

        const bm = createBookmark();

        try {
            sessionStorage.setItem(bookmarkId, JSON.stringify(bm));
        } catch {
            // nada
        }

        setLoading(true);
        const verifier = generateRandomString();
        const challenge = await generateCodeChallenge(verifier);
        saveToStorage(StorageKey.DitioCodeVerifier, verifier);

        window.location.href =
            authConfig?.authorization_endpoint +
            `?response_type=code` +
            `&client_id=${ditioClientId}` +
            `&scope=${scope}` +
            `&redirect_uri=${window.location.origin}` +
            `&code_challenge=${challenge}` +
            `&code_challenge_method=S256` +
            `&state=${state}`;
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            {isLoadingAuthConfig && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1}>
                {isError ? (
                    `An error occured loading ${featuresConfig.ditio.name}'s authentication configuration.`
                ) : (
                    <>
                        <Box display="flex" justifyContent="center">
                            <LoadingButton
                                onClick={handleLoginRedirect}
                                type="submit"
                                sx={{ mt: 4, mb: 2, minWidth: 200 }}
                                variant="contained"
                                color="primary"
                                size="large"
                                loading={loading || isLoadingAuthConfig}
                                loadingIndicator={
                                    <Box position={"relative"} display="flex" alignItems="center" minWidth={140}>
                                        Log in to {featuresConfig.ditio.name}
                                        <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                                    </Box>
                                }
                            >
                                Log in to {featuresConfig.ditio.name}
                            </LoadingButton>
                        </Box>
                        <Typography textAlign={"center"} color={theme.palette.text.secondary}>
                            Redirects to {featuresConfig.ditio.name} login page outside of Novorender.
                        </Typography>
                    </>
                )}
            </ScrollBox>
        </>
    );
}
