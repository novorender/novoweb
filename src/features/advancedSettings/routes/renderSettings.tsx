import { ArrowBack, Save } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Slider, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AccordionDetails, AccordionSummary, Divider, LinearProgress, Switch, WidgetBottomScrollBox } from "components";
import {
    renderActions,
    selectAdvanced,
    selectPoints,
    selectSubtrees,
    selectTerrain,
    Subtree,
    SubtreeStatus,
} from "features/render";
import { selectUser } from "slices/authSlice";

import { AdvSettingsAccordion as Accordion } from "../components/advSettingsAccordion";

export function RenderSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();
    const { t } = useTranslation();

    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const subtrees = useAppSelector(selectSubtrees);
    // const deviceProfile = useAppSelector(selectDeviceProfile);
    const advanced = useAppSelector(selectAdvanced);
    const points = useAppSelector(selectPoints);
    const terrain = useAppSelector(selectTerrain);

    const [size, setSize] = useState(points.size.pixel);
    const [maxSize, setMaxSize] = useState(points.size.maxPixel);
    const [toleranceFactor, setToleranceFactor] = useState(points.size.toleranceFactor);
    const [lightExposure, setLightExposure] = useState(advanced.tonemapping.exposure);
    // const [maxTris, setMaxTris] = useState(advanced.limits.maxPrimitives);

    const handleSubtreeToggle = (subtree: Subtree) => () => {
        dispatch(renderActions.toggleSubtree({ subtree }));
    };

    const showPointSettings = subtrees?.points !== SubtreeStatus.Unavailable;
    const showMeshSettings = subtrees?.triangles !== SubtreeStatus.Unavailable;
    const showLineSettings = subtrees?.lines !== SubtreeStatus.Unavailable;
    const showTerrainSettings = subtrees?.terrain !== SubtreeStatus.Unavailable;
    const showDocumentSettings = subtrees?.documents !== SubtreeStatus.Unavailable;

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={save} color="grey" disabled={saving}>
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
            <WidgetBottomScrollBox height={1} mt={1} pb={3}>
                <Typography p={1} pb={0} variant="h6" fontWeight={600}>
                    {t("renderSettings")}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box p={1} display="flex" flexDirection="column">
                    <FormControlLabel
                        id="render-msaa"
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                checked={advanced.msaa.enabled}
                                name="msaa"
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setAdvanced({ msaa: { enabled: checked } }))
                                }
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("antiAliasing")}
                            </Box>
                        }
                    />
                    <FormControlLabel
                        id="render-toon-outline"
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                name="toon-outline"
                                checked={advanced.toonOutline.enabled}
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setAdvanced({ toonOutline: { enabled: checked } }))
                                }
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("toonOutlines")}
                            </Box>
                        }
                    />
                    <FormControlLabel
                        id="render-toon-outline-each-object"
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                name="toon-outline"
                                checked={advanced.toonOutline.enabled && advanced.toonOutline.outlineObjects}
                                disabled={!advanced.toonOutline.enabled}
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setAdvanced({ toonOutline: { outlineObjects: checked } }))
                                }
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("toonOutlineEachObject")}
                            </Box>
                        }
                    />
                    {user?.features?.debugInfo?.boundingBoxes ? (
                        <FormControlLabel
                            sx={{ ml: 0, mb: 2 }}
                            control={
                                <Switch
                                    name="debug-bb"
                                    checked={advanced.debug.showNodeBounds}
                                    onChange={(_evt, checked) =>
                                        dispatch(
                                            renderActions.setAdvanced({
                                                debug: { showNodeBounds: checked },
                                            }),
                                        )
                                    }
                                />
                            }
                            label={
                                <Box ml={1} fontSize={16}>
                                    {t("showNodeBounds")}
                                </Box>
                            }
                        />
                    ) : null}
                </Box>

                <Divider sx={{ borderColor: theme.palette.grey[300], mb: 2 }} />
                {showMeshSettings ? (
                    <Accordion id="render-mesh">
                        <AccordionSummary>{t("mesh")}</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    id="render-mesh-show"
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.triangles === SubtreeStatus.Shown}
                                            name="show-triangles"
                                            onChange={() =>
                                                dispatch(renderActions.toggleSubtree({ subtree: "triangles" }))
                                            }
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("show")}
                                        </Box>
                                    }
                                />

                                {/* <Divider sx={{ borderColor: theme.palette.grey[300], my: 2 }} />

                                <Box display="flex" sx={{ mb: 0 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Triangle limit
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={500_000}
                                        max={20_000_000}
                                        step={500_000}
                                        valueLabelFormat={(value) => value / 1_000_000}
                                        value={maxTris}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) =>
                                            !Array.isArray(value) ? setMaxTris(value) : undefined
                                        }
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(
                                                      renderActions.setAdvanced({ limits: { maxPrimitives: value } })
                                                  )
                                                : undefined
                                        }
                                    />
                                </Box>
                                <FormHelperText>
                                    Value is in millions. Max for this device is{" "}
                                    {deviceProfile.limits.maxPrimitives / 1_000_000} million.
                                </FormHelperText> */}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showPointSettings ? (
                    <Accordion id="render-points">
                        <AccordionSummary>{t("points")}</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    id="render-points-show"
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            name="show-points"
                                            checked={subtrees && subtrees?.points === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("points")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("show")}
                                        </Box>
                                    }
                                />

                                <Divider sx={{ borderColor: theme.palette.grey[300], mb: 2 }} />

                                <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {t("pointSize")}
                                    </Typography>
                                    <Slider
                                        id="render-points-size"
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={0}
                                        max={2}
                                        step={0.1}
                                        value={size}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) => (!Array.isArray(value) ? setSize(value) : undefined)}
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(renderActions.setPoints({ size: { pixel: value } }))
                                                : undefined
                                        }
                                    />
                                </Box>
                                <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {t("maxPointSize")}
                                    </Typography>
                                    <Slider
                                        id="render-points-max-point-size"
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={1}
                                        max={100}
                                        step={1}
                                        value={maxSize}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) =>
                                            !Array.isArray(value) ? setMaxSize(value) : undefined
                                        }
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(renderActions.setPoints({ size: { maxPixel: value } }))
                                                : undefined
                                        }
                                    />
                                </Box>
                                <Box display="flex" alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {t("toleranceFactor")}
                                    </Typography>
                                    <Slider
                                        id="render-points-tolerance-factor"
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={0}
                                        max={2}
                                        step={0.05}
                                        value={toleranceFactor}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) =>
                                            !Array.isArray(value) ? setToleranceFactor(value) : undefined
                                        }
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(
                                                      renderActions.setPoints({ size: { toleranceFactor: value } }),
                                                  )
                                                : undefined
                                        }
                                    />
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showLineSettings ? (
                    <Accordion id="render-lines">
                        <AccordionSummary>{t("lines")}</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    id="render-lines-show"
                                    sx={{ ml: 0 }}
                                    control={
                                        <Switch
                                            name="show-lines"
                                            checked={subtrees && subtrees?.lines === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("lines")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("show")}
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showTerrainSettings ? (
                    <Accordion id="render-terrain">
                        <AccordionSummary>{t("terrain")}</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    id="render-terrain-show"
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            name="show-terrain"
                                            checked={subtrees && subtrees?.terrain === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("terrain")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("show")}
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    id="render-terrain-as-background"
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            name="terrain-as-background"
                                            checked={terrain.asBackground}
                                            onChange={(_evt, checked) =>
                                                dispatch(renderActions.setTerrain({ asBackground: checked }))
                                            }
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("renderAsBackground")}
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showDocumentSettings ? (
                    <Accordion id="render-document">
                        <AccordionSummary>{t("pdf")}</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    id="render-document-show"
                                    sx={{ ml: 0 }}
                                    control={
                                        <Switch
                                            name="show-documents"
                                            checked={subtrees && subtrees?.documents === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("documents")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("show")}
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                <Accordion id="render-light">
                    <AccordionSummary>{t("light")}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <Box id="render-light-exposure" display="flex" alignItems="center">
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    {t("lightExposure")}
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={lightExposure}
                                    valueLabelDisplay="auto"
                                    onChange={(_evt, value) =>
                                        !Array.isArray(value) ? setLightExposure(value) : undefined
                                    }
                                    onChangeCommitted={(_evt, value) =>
                                        !Array.isArray(value)
                                            ? dispatch(renderActions.setAdvanced({ tonemapping: { exposure: value } }))
                                            : undefined
                                    }
                                />
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </WidgetBottomScrollBox>
        </>
    );
}
