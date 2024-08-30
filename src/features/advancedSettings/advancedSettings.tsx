import { Close, Save } from "@mui/icons-material";
import { Box, Button, IconButton, List, ListItemButton, Snackbar, useTheme } from "@mui/material";
import { quat, vec3 } from "gl-matrix";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MemoryRouter, Route, Switch } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppSelector } from "app/redux-store-interactions";
import {
    Divider,
    LinearProgress,
    LogoSpeedDial,
    WidgetBottomScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { canvasContextMenuConfig } from "config/canvasContextMenu";
import { featuresConfig, FeatureType } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { HighlightCollection, useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { selectPropertiesSettings } from "features/properties/slice";
import {
    selectAdvanced,
    selectBackground,
    selectCameraDefaults,
    selectDebugStats,
    selectGeneratedParametricData,
    selectNavigationCube,
    selectPoints,
    selectProjectSettings,
    selectSecondaryHighlightProperty,
    selectSubtrees,
    selectTerrain,
    Subtree,
    SubtreeStatus,
} from "features/render";
import { loadScene } from "features/render/utils";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import {
    selectCanvasContextMenuFeatures,
    selectEnabledWidgets,
    selectIsAdminScene,
    selectMaximized,
    selectMinimized,
    selectPrimaryMenu,
} from "slices/explorer";
import { CustomProperties } from "types/project";
import { mergeRecursive } from "utils/misc";

import { CameraSettings } from "./routes/cameraSettings";
import { ClippingSettings } from "./routes/clipSettings";
import { FeatureSettings } from "./routes/featureSettings";
import { ObjectSelectionSettings } from "./routes/objectSelectionSettings";
import { PerformanceSettings } from "./routes/performanceSettings";
import { ProjectSettings } from "./routes/projectSettings";
import { RenderSettings } from "./routes/renderSettings";
import { SceneSettings } from "./routes/sceneSettings";

enum Status {
    Idle,
    Saving,
    SaveSuccess,
    SaveError,
}

export default function AdvancedSettings() {
    const sceneId = useSceneId();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.advancedSettings.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.advancedSettings.key);
    const [status, setStatus] = useState(Status.Idle);
    const saving = status === Status.Saving;

    const isAdminScene = useAppSelector(selectIsAdminScene);
    const subtrees = useAppSelector(selectSubtrees);
    const cameraDefaults = useAppSelector(selectCameraDefaults);
    const advanced = useAppSelector(selectAdvanced);
    const points = useAppSelector(selectPoints);
    const terrain = useAppSelector(selectTerrain);
    const { environments: _environments, ...background } = useAppSelector(selectBackground);
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const projectSettings = useAppSelector(selectProjectSettings);
    const primaryMenu = useAppSelector(selectPrimaryMenu);
    const canvasCtxMenu = useAppSelector(selectCanvasContextMenuFeatures);
    const propertiesSettings = useAppSelector(selectPropertiesSettings);
    const secondaryHighlightProperty = useAppSelector(selectSecondaryHighlightProperty);
    const primaryHighlightColor = useHighlighted().color;
    const secondaryHighlightColor = useHighlightCollections()[HighlightCollection.SecondaryHighlight].color;
    const debugStats = useAppSelector(selectDebugStats);
    const navigationCube = useAppSelector(selectNavigationCube);
    const generatedParametricData = useAppSelector(selectGeneratedParametricData);

    const save = async () => {
        setStatus(Status.Saving);

        try {
            const [originalScene] = await loadScene(sceneId);

            const explorerProjectState: NonNullable<CustomProperties["explorerProjectState"]> = {
                renderSettings: {
                    ...advanced,
                    points,
                    terrain,
                    background,
                    hide: subtreesToHide(subtrees),
                },
                camera: cameraDefaults,
                features: {
                    widgets: {
                        enabled: enabledWidgets
                            .filter((widget) => widget.type !== FeatureType.AdminWidget)
                            .map((widget) => widget.key),
                    },
                    properties:
                        originalScene.customProperties.explorerProjectState?.features?.properties ?? propertiesSettings,
                    generatedParametricData,
                    navigationCube,
                    debugStats,
                    primaryMenu: {
                        buttons: Object.values(primaryMenu),
                    },
                    contextMenus: {
                        canvas: {
                            primary: {
                                features: canvasCtxMenu.filter(
                                    (feature) => canvasContextMenuConfig[feature] !== undefined,
                                ),
                            },
                        },
                    },
                },
                highlights: {
                    primary: {
                        color: primaryHighlightColor,
                    },
                    secondary: {
                        color: secondaryHighlightColor,
                        property: secondaryHighlightProperty,
                    },
                },
            };

            const updated = mergeRecursive(originalScene, {
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    explorerProjectState,
                },
                tmZone: projectSettings.tmZone,
            });

            await dataApi.putScene(updated);

            return setStatus(Status.SaveSuccess);
        } catch (e) {
            console.warn(e);
            return setStatus(Status.SaveError);
        }
    };

    const saveCameraPos = async (cameraState: {
        kind: "pinhole" | "orthographic";
        position: vec3;
        rotation: quat;
        fov: number;
    }) => {
        setStatus(Status.Saving);

        try {
            const [originalScene] = await loadScene(sceneId);

            await dataApi.putScene(
                mergeRecursive(originalScene, {
                    url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                    customProperties: {
                        initialCameraState: cameraState,
                    },
                }),
            );
        } catch (e) {
            console.warn(e);
            return setStatus(Status.SaveError);
        }

        setStatus(Status.SaveSuccess);
    };

    const showSnackbar = [Status.SaveError, Status.SaveSuccess].includes(status);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={{ ...featuresConfig.advancedSettings, nameKey: "advancedSettings" }}
                    disableShadow
                />

                {minimized && saving ? (
                    <Box position="relative" bottom={3}>
                        <LinearProgress />
                    </Box>
                ) : null}

                {showSnackbar ? (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        sx={{
                            width: { xs: "auto", sm: 350 },
                            bottom: { xs: "auto", sm: 24 },
                            top: { xs: 24, sm: "auto" },
                        }}
                        autoHideDuration={2500}
                        open={showSnackbar}
                        onClose={() => setStatus(Status.Idle)}
                        message={
                            status === Status.SaveError ? t("failedToSaveSettings") : t("settingsSuccessfullySaved")
                        }
                        action={
                            <IconButton
                                size="small"
                                aria-label="close"
                                color="inherit"
                                onClick={() => setStatus(Status.Idle)}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        }
                    />
                ) : null}

                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    <MemoryRouter>
                        <Switch>
                            <Route path="/" exact>
                                <Root save={save} saving={saving} />
                            </Route>
                            <Route path="/scene" exact>
                                <SceneSettings save={save} saveCameraPos={saveCameraPos} saving={saving} />
                            </Route>
                            <Route path="/features" exact>
                                <FeatureSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/project" exact>
                                <ProjectSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/objectSelection" exact>
                                <ObjectSelectionSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/clipping" exact>
                                <ClippingSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/camera" exact>
                                <CameraSettings save={save} saveCameraPos={saveCameraPos} saving={saving} />
                            </Route>
                            <Route path="/render" exact>
                                <RenderSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/performance" exact>
                                <PerformanceSettings />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.advancedSettings.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
        </>
    );
}

function Root({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const theme = useTheme();
    const { t } = useTranslation();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="flex-end">
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <WidgetBottomScrollBox height={1} mt={1} pb={3} display="flex" flexDirection="column">
                <List disablePadding>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/scene">
                        {t("scene")}
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/features">
                        {t("features")}
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/project">
                        {t("project")}
                    </ListItemButton>
                    <ListItemButton
                        sx={{ pl: 1, fontWeight: 600 }}
                        disableGutters
                        component={Link}
                        to="/objectSelection"
                    >
                        {t("objectSelection")}
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/clipping">
                        {t("clipping")}
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/camera">
                        {t("camera")}
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/render">
                        {t("render")}
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/performance">
                        {t("performance")}
                    </ListItemButton>
                </List>
            </WidgetBottomScrollBox>
        </>
    );
}

function subtreesToHide(
    subtrees: Record<Subtree, SubtreeStatus>,
): NonNullable<NonNullable<CustomProperties["explorerProjectState"]>["renderSettings"]>["hide"] {
    return {
        terrain: subtrees.terrain === SubtreeStatus.Hidden,
        triangles: subtrees.triangles === SubtreeStatus.Hidden,
        points: subtrees.points === SubtreeStatus.Hidden,
        documents: subtrees.documents === SubtreeStatus.Hidden,
        lines: subtrees.lines === SubtreeStatus.Hidden,
    };
}
