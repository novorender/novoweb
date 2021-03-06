import { useState, ChangeEvent, SyntheticEvent } from "react";
import { useTheme, Box, Button, FormControlLabel, Slider, Typography } from "@mui/material";
import { Internal } from "@novorender/webgl-api";
import { useHistory } from "react-router-dom";
import { ArrowBack, Save } from "@mui/icons-material";

import { Accordion, AccordionDetails, AccordionSummary, Divider, LinearProgress, ScrollBox, Switch } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    AdvancedSetting,
    selectAdvancedSettings,
    renderActions,
    selectSubtrees,
    SubtreeStatus,
    Subtree,
} from "slices/renderSlice";
import { selectUser } from "slices/authSlice";

import {
    toggleAutoFps,
    toggleShowBoundingBox,
    toggleDoubleSidedMaterials,
    toggleDoubleSidedTransparentMaterials,
    toggleHoldDynamic,
    toggleTriangleBudget,
    toggleQualityPoints,
    toggleTerrainAsBackground,
} from "../utils";

type SliderSettings =
    | AdvancedSetting.PointSize
    | AdvancedSetting.MaxPointSize
    | AdvancedSetting.PointToleranceFactor
    | AdvancedSetting.AmbientLight;

export function RenderSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const subtrees = useAppSelector(selectSubtrees);
    const settings = useAppSelector(selectAdvancedSettings);
    const {
        taa,
        ssao,
        autoFps,
        showBoundingBoxes,
        doubleSidedMaterials,
        doubleSidedTransparentMaterials,
        holdDynamic,
        triangleBudget,
        qualityPoints,
        pointSize,
        maxPointSize,
        pointToleranceFactor,
        ambientLight,
        terrainAsBackground,
    } = settings;

    const [size, setSize] = useState(pointSize);
    const [maxSize, setMaxSize] = useState(maxPointSize);
    const [toleranceFactor, setToleranceFactor] = useState(pointToleranceFactor);
    const [ambLight, setAmbLight] = useState(ambientLight);

    const handleSubtreeToggle = (subtree: Subtree) => () => {
        dispatch(renderActions.toggleSubtree({ subtree }));
    };

    const handleToggle = ({ target: { name, checked } }: ChangeEvent<HTMLInputElement>) => {
        dispatch(renderActions.setAdvancedSettings({ [name]: checked }));

        switch (name) {
            case AdvancedSetting.AutoFps:
                return toggleAutoFps(view);
            case AdvancedSetting.ShowBoundingBoxes:
                return toggleShowBoundingBox(view);
            case AdvancedSetting.DoubleSidedMaterials:
                return toggleDoubleSidedMaterials(view);
            case AdvancedSetting.DoubleSidedTransparentMaterials:
                return toggleDoubleSidedTransparentMaterials(view);
            case AdvancedSetting.HoldDynamic:
                return toggleHoldDynamic(view);
            case AdvancedSetting.TriangleBudget:
                return toggleTriangleBudget(view);
            case AdvancedSetting.QualityPoints:
                return toggleQualityPoints(view);
            case AdvancedSetting.TerrainAsBackground:
                return toggleTerrainAsBackground(view);
            default:
                return;
        }
    };

    const handleSliderChange =
        (kind: SliderSettings) =>
        (_event: Event, value: number | number[]): void => {
            if (Array.isArray(value)) {
                return;
            }

            const { points, light } = view.settings as Internal.RenderSettingsExt;

            switch (kind) {
                case AdvancedSetting.PointSize:
                    setSize(value);
                    points.size.pixel = value;
                    return;
                case AdvancedSetting.MaxPointSize:
                    setMaxSize(value);
                    points.size.maxPixel = value;
                    return;
                case AdvancedSetting.PointToleranceFactor:
                    setToleranceFactor(value);
                    points.size.toleranceFactor = value;
                    return;
                case AdvancedSetting.AmbientLight:
                    setAmbLight(value);
                    light.ambient.brightness = value;
                    view.performanceStatistics.cameraGeneration++;
                    return;
            }
        };

    const handleSliderCommit =
        (kind: SliderSettings) => (_event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
            if (Array.isArray(value)) {
                return;
            }

            switch (kind) {
                case AdvancedSetting.PointSize:
                case AdvancedSetting.MaxPointSize:
                case AdvancedSetting.PointToleranceFactor:
                case AdvancedSetting.AmbientLight:
                    dispatch(renderActions.setAdvancedSettings({ [kind]: value }));
            }
        };

    const showPointSettings = subtrees?.points !== SubtreeStatus.Unavailable;
    const showMeshSettings = subtrees?.triangles !== SubtreeStatus.Unavailable;
    const showLineSettings = subtrees?.lines !== SubtreeStatus.Unavailable;
    const showTerrainSettings = subtrees?.terrain !== SubtreeStatus.Unavailable;

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={save} color="grey" disabled={saving}>
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
            <ScrollBox height={1} pb={3}>
                <Box p={1} mt={1}>
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={<Switch name={AdvancedSetting.AutoFps} checked={autoFps} onChange={handleToggle} />}
                        label={
                            <Box ml={1} fontSize={16}>
                                Dynamic resolution scaling
                            </Box>
                        }
                    />
                    <Divider />
                </Box>
                {showMeshSettings ? (
                    <Accordion>
                        <AccordionSummary>Mesh</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.triangles === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("triangles")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch name={AdvancedSetting.Taa} checked={taa} onChange={handleToggle} />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Temporal anti-aliasing (TAA)
                                        </Box>
                                    }
                                />
                                {user?.features?.debugInfo?.boundingBoxes ? (
                                    <FormControlLabel
                                        sx={{ ml: 0, mb: 2 }}
                                        control={
                                            <Switch
                                                name={AdvancedSetting.ShowBoundingBoxes}
                                                checked={showBoundingBoxes}
                                                onChange={handleToggle}
                                            />
                                        }
                                        label={
                                            <Box ml={1} fontSize={16}>
                                                Show bounding boxes
                                            </Box>
                                        }
                                    />
                                ) : null}
                                {user?.features?.doubleSided ? (
                                    <>
                                        <FormControlLabel
                                            sx={{ ml: 0, mb: 2 }}
                                            control={
                                                <Switch
                                                    name={AdvancedSetting.DoubleSidedMaterials}
                                                    checked={doubleSidedMaterials}
                                                    onChange={handleToggle}
                                                />
                                            }
                                            label={
                                                <Box ml={1} fontSize={16}>
                                                    Double sided materials
                                                </Box>
                                            }
                                        />
                                        <FormControlLabel
                                            sx={{ ml: 0, mb: 2 }}
                                            control={
                                                <Switch
                                                    name={AdvancedSetting.DoubleSidedTransparentMaterials}
                                                    checked={doubleSidedTransparentMaterials}
                                                    onChange={handleToggle}
                                                />
                                            }
                                            label={
                                                <Box ml={1} fontSize={16}>
                                                    Double sided transparent materials
                                                </Box>
                                            }
                                        />
                                    </>
                                ) : null}
                                {user?.features?.debugInfo?.holdDynamic ? (
                                    <FormControlLabel
                                        sx={{ ml: 0, mb: 2 }}
                                        control={
                                            <Switch
                                                name={AdvancedSetting.HoldDynamic}
                                                checked={holdDynamic}
                                                onChange={handleToggle}
                                            />
                                        }
                                        label={
                                            <Box ml={1} fontSize={16}>
                                                Hold dynamic
                                            </Box>
                                        }
                                    />
                                ) : null}
                                <FormControlLabel
                                    sx={{ ml: 0 }}
                                    control={
                                        <Switch
                                            name={AdvancedSetting.TriangleBudget}
                                            checked={triangleBudget}
                                            onChange={handleToggle}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Triangle budget
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showPointSettings ? (
                    <Accordion>
                        <AccordionSummary>Points</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.points === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("points")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            name={AdvancedSetting.QualityPoints}
                                            checked={qualityPoints}
                                            onChange={handleToggle}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Quality points
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
                                        Point size (pixels)
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={0}
                                        max={2}
                                        step={0.1}
                                        name={AdvancedSetting.PointSize}
                                        value={size}
                                        valueLabelDisplay="auto"
                                        onChange={handleSliderChange(AdvancedSetting.PointSize)}
                                        onChangeCommitted={handleSliderCommit(AdvancedSetting.PointSize)}
                                    />
                                </Box>
                                <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Max point size
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={1}
                                        max={100}
                                        step={1}
                                        name={AdvancedSetting.MaxPointSize}
                                        value={maxSize}
                                        valueLabelDisplay="auto"
                                        onChange={handleSliderChange(AdvancedSetting.MaxPointSize)}
                                        onChangeCommitted={handleSliderCommit(AdvancedSetting.MaxPointSize)}
                                    />
                                </Box>
                                <Box display="flex" alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Pt. tolerance factor
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={0}
                                        max={2}
                                        step={0.05}
                                        name={AdvancedSetting.PointToleranceFactor}
                                        value={toleranceFactor}
                                        valueLabelDisplay="auto"
                                        onChange={handleSliderChange(AdvancedSetting.PointToleranceFactor)}
                                        onChangeCommitted={handleSliderCommit(AdvancedSetting.PointToleranceFactor)}
                                    />
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showLineSettings ? (
                    <Accordion>
                        <AccordionSummary>Lines</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.lines === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("lines")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showTerrainSettings ? (
                    <Accordion>
                        <AccordionSummary>Terrain</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.terrain === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("terrain")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            name={AdvancedSetting.TerrainAsBackground}
                                            checked={terrainAsBackground}
                                            onChange={handleToggle}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Render terrain as background
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                <Accordion>
                    <AccordionSummary>Light</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <FormControlLabel
                                sx={{ ml: 0, mb: 1 }}
                                control={<Switch name={AdvancedSetting.Ssao} checked={ssao} onChange={handleToggle} />}
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Screen space ambient occlusion (SSAO)
                                    </Box>
                                }
                            />

                            <Divider sx={{ borderColor: theme.palette.grey[300], mb: 2 }} />

                            <Box display="flex" alignItems="center">
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    Ambient light
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    name={AdvancedSetting.AmbientLight}
                                    value={ambLight}
                                    valueLabelDisplay="auto"
                                    onChange={handleSliderChange(AdvancedSetting.AmbientLight)}
                                    onChangeCommitted={handleSliderCommit(AdvancedSetting.AmbientLight)}
                                />
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </ScrollBox>
        </>
    );
}
