import { Link, MemoryRouter, Route, Switch } from "react-router-dom";
import { Close, Save } from "@mui/icons-material";
import { Box, Button, IconButton, List, ListItemButton, Snackbar, useTheme } from "@mui/material";
import { SceneData } from "@novorender/data-js-api";
import { FlightControllerParams, Internal, OrthoControllerParams } from "@novorender/webgl-api";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { featuresConfig, FeatureType } from "config/features";
import { Divider, LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { WidgetList } from "features/widgetList";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    selectAdvancedSettings,
    selectBaseCameraSpeed,
    selectProjectSettings,
    selectSubtrees,
    SubtreeStatus,
} from "slices/renderSlice";
import { selectEnabledWidgets, selectIsAdminScene, selectMaximized, selectMinimized } from "slices/explorerSlice";

import { useMountedState } from "hooks/useMountedState";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import { CameraSettings } from "./routes/cameraSettings";
import { FeatureSettings } from "./routes/featureSettings";
import { RenderSettings } from "./routes/renderSettings";
import { ProjectSettings } from "./routes/projectSettings";

enum Status {
    Idle,
    Saving,
    SaveSuccess,
    SaveError,
}

export function AdvancedSettings() {
    const sceneId = useSceneId();
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);

    const isAdminScene = useAppSelector(selectIsAdminScene);
    const subtrees = useAppSelector(selectSubtrees);
    const settings = useAppSelector(selectAdvancedSettings);
    const projectSettings = useAppSelector(selectProjectSettings);
    const baseCameraSpeed = useAppSelector(selectBaseCameraSpeed);
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.advancedSettings.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.advancedSettings.key;
    const [status, setStatus] = useMountedState(Status.Idle);
    const saving = status === Status.Saving;

    const save = async () => {
        setStatus(Status.Saving);

        try {
            const {
                url: _url,
                customProperties = {},
                camera,
                ...originalScene
            } = (await dataApi.loadScene(sceneId)) as SceneData;

            const originalSettings = originalScene.settings as undefined | Internal.RenderSettingsExt;

            await dataApi.putScene({
                ...originalScene,
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                settings: !originalSettings
                    ? view.settings
                    : ({
                          ...originalSettings,
                          advanced: {
                              ...originalSettings.advanced,
                              hideTriangles: subtrees?.triangles === SubtreeStatus.Hidden,
                              hidePoints: subtrees?.points === SubtreeStatus.Hidden,
                              hideTerrain: subtrees?.terrain === SubtreeStatus.Hidden,
                              hideLines: subtrees?.lines === SubtreeStatus.Hidden,
                              doubleSided: {
                                  opaque: settings.doubleSidedMaterials,
                                  transparent: settings.doubleSidedTransparentMaterials,
                              },
                          },
                          diagnostics: {
                              ...originalSettings.diagnostics,
                              holdDynamic: settings.holdDynamic,
                              showBoundingBoxes: settings.showBoundingBoxes,
                          },
                          light: {
                              ...originalSettings.light,
                              camera: {
                                  ...originalSettings.light.camera,
                                  brightness: settings.headlightIntensity,
                                  distance: settings.headlightDistance,
                              },
                              ambient: {
                                  ...originalSettings.light.ambient,
                                  brightness: settings.ambientLight,
                              },
                          },
                          points: {
                              ...originalSettings.points,
                              shape: settings.qualityPoints ? "disc" : "square",
                              size: {
                                  ...originalSettings.points.size,
                                  pixel: settings.pointSize,
                                  maxPixel: settings.maxPointSize,
                                  toleranceFactor: settings.pointToleranceFactor,
                              },
                          },
                      } as Internal.RenderSettingsExt),
                camera:
                    !camera || !["flight", "ortho"].includes(camera.kind)
                        ? view.camera.controller.params
                        : {
                              ...(camera as Required<FlightControllerParams | OrthoControllerParams>),
                              far: settings.cameraFarClipping,
                              near: settings.cameraNearClipping,
                              linearVelocity: baseCameraSpeed,
                          },
                customProperties: {
                    ...customProperties,
                    showStats: settings.showPerformance,
                    navigationCube: settings.navigationCube,
                    ditioProjectNumber: projectSettings.ditioProjectNumber,
                    leicaProjectId: projectSettings.leicaProjectId,
                    flightMouseButtonMap: settings.mouseButtonMap,
                    flightFingerMap: settings.fingerMap,
                    enabledFeatures: {
                        ...Object.fromEntries(
                            enabledWidgets
                                .filter((widget) => widget.type === FeatureType.Widget)
                                .map((widget) => [widget.key, true]) as [string, any]
                        ),
                        enabledOrgs: customProperties?.enabledFeatures?.enabledOrgs,
                        expiration: customProperties?.enabledFeatures?.expiration,
                        transparentBackground: customProperties?.enabledFeatures?.transparentBackground,
                        requireConsent: customProperties?.enabledFeatures?.requireConsent,
                    },
                },
                tmZone: projectSettings.tmZone,
            });
        } catch {
            return setStatus(Status.SaveError);
        }

        setStatus(Status.SaveSuccess);
    };

    const saveCameraPos = async (camera: Required<FlightControllerParams>) => {
        setStatus(Status.Saving);

        try {
            const { url: _url, ...originalScene } = (await dataApi.loadScene(sceneId)) as SceneData;

            await dataApi.putScene({
                ...originalScene,
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                camera: {
                    ...camera,
                    linearVelocity: baseCameraSpeed,
                },
            });
        } catch {
            return setStatus(Status.SaveError);
        }

        setStatus(Status.SaveSuccess);
    };

    const showSnackbar = [Status.SaveError, Status.SaveSuccess].includes(status);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    widget={{ ...featuresConfig.advancedSettings, name: "Advanced settings" as any }}
                    disableShadow={!menuOpen}
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
                            status === Status.SaveError ? "Failed to save settings" : "Settings successfully saved"
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
                            <Route path="/camera" exact>
                                <CameraSettings save={save} saveCameraPos={saveCameraPos} saving={saving} />
                            </Route>
                            <Route path="/features" exact>
                                <FeatureSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/project" exact>
                                <ProjectSettings save={save} saving={saving} />
                            </Route>
                            <Route path="/render" exact>
                                <RenderSettings save={save} saving={saving} />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.advancedSettings.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.advancedSettings.key}-widget-menu-fab`}
                ariaLabel="toggle widget menu"
            />
        </>
    );
}

function Root({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const theme = useTheme();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="flex-end">
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        Save
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box>
                    <LinearProgress />
                </Box>
            ) : null}
            <Box height={1} mt={1} pb={3} display="flex" flexDirection="column">
                <List disablePadding>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/features">
                        Features
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/project">
                        Project
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/camera">
                        Camera
                    </ListItemButton>
                    <ListItemButton sx={{ pl: 1, fontWeight: 600 }} disableGutters component={Link} to="/render">
                        Render
                    </ListItemButton>
                </List>
            </Box>
        </>
    );
}
