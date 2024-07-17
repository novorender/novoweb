import { LoadingButton } from "@mui/lab";
import { Box, CircularProgress, Grid } from "@mui/material";
import { useState } from "react";

import { dataApi } from "apis/dataV1";
import { useAppSelector } from "app/redux-store-interactions";
import { LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { StorageKey } from "config/storage";
import { useCreateBookmark } from "features/bookmarks";
import { selectSceneOrganization } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectUser, User as UserType } from "slices/authSlice";
import { selectConfig, selectMaximized, selectMinimized, selectUserRole, UserRole } from "slices/explorer";
import { createOAuthStateString, generateCodeChallenge } from "utils/auth";
import { deleteFromStorage, saveToStorage } from "utils/storage";

export default function User() {
    const [menuOpen, toggleMenu] = useToggle();
    const [loading, setLoading] = useState(false);

    const minimized = useAppSelector(selectMinimized) === featuresConfig.user.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.user.key);

    const user = useAppSelector(selectUser);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.user}
                    disableShadow={menuOpen}
                />
                {loading && (
                    <Box>
                        <LinearProgress />
                    </Box>
                )}
                <ScrollBox p={1} mt={2} display={!menuOpen && !minimized ? "flex" : "none"} flexDirection="column">
                    {user ? (
                        <LoggedIn user={user} loading={loading} setLoading={setLoading} />
                    ) : (
                        <LoggedOut loading={loading} setLoading={setLoading} />
                    )}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.user.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function LoggedIn({
    user,
    loading,
    setLoading,
}: {
    user: UserType;
    loading: boolean;
    setLoading: (state: boolean) => void;
}) {
    const role = useAppSelector(selectUserRole);
    const org = useAppSelector(selectSceneOrganization);
    const config = useAppSelector(selectConfig);

    const logOut = () => {
        setLoading(true);
        deleteFromStorage(StorageKey.AccessToken);
        deleteFromStorage(StorageKey.RefreshToken);
        window.location.href = `${config.authServerUrl}/signout?return_url=${window.location.href}`;
    };

    return (
        <>
            <Grid container>
                <Grid fontWeight={600} item xs={5}>
                    User:
                </Grid>
                <Grid item xs={7}>
                    {user.user}
                </Grid>

                <Grid fontWeight={600} item xs={5}>
                    Role:
                </Grid>
                <Grid item xs={7}>
                    {role === UserRole.Admin ? "Admin" : role === UserRole.Owner ? "Owner" : "Viewer"}
                </Grid>
                {org && (
                    <>
                        <Grid fontWeight={600} item xs={5}>
                            Organization:
                        </Grid>
                        <Grid item xs={7}>
                            {org}
                        </Grid>
                    </>
                )}
            </Grid>
            <LoadingButton
                onClick={logOut}
                sx={{ mt: 4, mb: 2, minWidth: 250 }}
                variant="outlined"
                size="large"
                loading={loading}
                loadingIndicator={
                    <Box position={"relative"} display="flex" alignItems="center" minWidth={75}>
                        Log out
                        <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                    </Box>
                }
            >
                Log out
            </LoadingButton>
        </>
    );
}

function LoggedOut({ loading, setLoading }: { loading: boolean; setLoading: (state: boolean) => void }) {
    const sceneId = useSceneId();
    const createBookmark = useCreateBookmark();
    const config = useAppSelector(selectConfig);

    const handleLoginRedirect = async () => {
        const bookmarkId = window.crypto.randomUUID();
        const state = createOAuthStateString({
            sceneId,
            service: "self",
            localBookmarkId: bookmarkId,
        });

        const bm = createBookmark();

        try {
            sessionStorage.setItem(bookmarkId, JSON.stringify(bm));
        } catch {
            // nada
        }

        setLoading(true);
        const [verifier, challenge] = await generateCodeChallenge();
        saveToStorage(StorageKey.CodeVerifier, verifier);

        const tenant = await fetch(`${dataApi.serviceUrl}/scenes/${sceneId}`)
            .then((res) => res.json())
            .then((res) => ("tenant" in res ? res.tenant : undefined))
            .catch((_err) => undefined);

        window.location.href =
            config.authServerUrl +
            `/auth` +
            "?response_type=code" +
            `&client_id=${config.novorenderClientId}` +
            `&redirect_uri=${window.location.origin}` +
            `&state=${state}` +
            `&code_challenge=${challenge}` +
            `&code_challenge_method=S256` +
            (tenant ? `&tenant_id=${tenant}` : "");
    };

    return (
        <ScrollBox p={1}>
            <Box display="flex" justifyContent="center">
                <LoadingButton
                    onClick={handleLoginRedirect}
                    sx={{ mt: 4, mb: 2, minWidth: 250 }}
                    variant="contained"
                    color="primary"
                    size="large"
                    loading={loading}
                    loadingIndicator={
                        <Box position={"relative"} display="flex" alignItems="center" minWidth={75}>
                            Log in
                            <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                        </Box>
                    }
                >
                    Log in
                </LoadingButton>
            </Box>
        </ScrollBox>
    );
}
