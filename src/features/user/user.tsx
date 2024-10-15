import { InfoOutlined } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Box, CircularProgress, Grid, Link, Tooltip } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { dataApi } from "apis/dataV1";
import { useGetCurrentUserRoleAssignmentsQuery } from "apis/dataV2/dataV2Api";
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
import {
    selectConfig,
    selectMaximized,
    selectMinimized,
    selectProjectName,
    selectProjectV2Info,
} from "slices/explorer";
import { createOAuthStateString, generateCodeChallenge } from "utils/auth";
import { capitalizeFirst } from "utils/misc";
import { deleteFromStorage, saveToStorage } from "utils/storage";

import { LanguageSelector } from "./languageSelector";

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
                    widget={{ ...featuresConfig.user, nameKey: "user" }}
                    disableShadow={menuOpen}
                />
                {loading && (
                    <Box>
                        <LinearProgress />
                    </Box>
                )}
                <ScrollBox p={1} mt={2} display={!menuOpen && !minimized ? "flex" : "none"} flexDirection="column">
                    <LanguageSelector />
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
    const { t } = useTranslation();

    const org = useAppSelector(selectSceneOrganization);
    const config = useAppSelector(selectConfig);
    const sceneId = useSceneId();
    const projectId = useAppSelector(selectProjectV2Info).id;
    const projectName = useAppSelector(selectProjectName);
    const projectsUrl = useAppSelector(selectConfig).projectsUrl;
    const { data: roles } = useGetCurrentUserRoleAssignmentsQuery({
        organizationId: org,
        projectId,
        viewerSceneId: projectId !== sceneId ? sceneId : undefined,
    });

    const logOut = () => {
        setLoading(true);
        deleteFromStorage(StorageKey.AccessToken);
        deleteFromStorage(StorageKey.RefreshToken);
        window.location.href = `${config.authServerUrl}/signout?return_url=${window.location.href}`;
    };

    let sceneUrl = "";
    if (projectsUrl && projectId) {
        if (projectId === sceneId) {
            sceneUrl = `${projectsUrl}/org/${org}/p/${projectId}/resources`;
        } else {
            sceneUrl = `${projectsUrl}/org/${org}/p/${projectId}/viewer_scenes?sceneId=${sceneId}`;
        }
    }

    return (
        <>
            <Grid container>
                <Grid fontWeight={600} item xs={5}>
                    {t("userName")}
                </Grid>
                <Grid item xs={7}>
                    {user.user}
                </Grid>

                {roles && (
                    <>
                        <Grid fontWeight={600} item xs={5}>
                            {t(roles.length > 1 ? "roles" : "role")}
                        </Grid>
                        <Grid item xs={7}>
                            {roles.map((role) => (
                                <div key={role.id}>
                                    {capitalizeFirst(role.name)}{" "}
                                    <Tooltip title={role.description}>
                                        <InfoOutlined fontSize="small" sx={{ verticalAlign: "text-bottom" }} />
                                    </Tooltip>
                                </div>
                            ))}
                        </Grid>
                    </>
                )}
                {org && (
                    <>
                        <Grid fontWeight={600} item xs={5}>
                            {t("organization")}
                        </Grid>
                        <Grid item xs={7}>
                            {org}
                        </Grid>
                    </>
                )}
                {sceneUrl && projectName && (
                    <>
                        <Grid fontWeight={600} item xs={5}>
                            Project:
                        </Grid>
                        <Grid item xs={7}>
                            <Link href={sceneUrl} target="_blank">
                                {projectName}
                            </Link>
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
                        {t("logOut")}
                        <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                    </Box>
                }
            >
                {t("logOut")}
            </LoadingButton>
        </>
    );
}

function LoggedOut({ loading, setLoading }: { loading: boolean; setLoading: (state: boolean) => void }) {
    const { t } = useTranslation();
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
                            {t("logIn")}
                            <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                        </Box>
                    }
                >
                    {t("logIn")}
                </LoadingButton>
            </Box>
        </ScrollBox>
    );
}
