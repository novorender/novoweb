import { Divider, FormControlLabel, Slider, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { ChangeEvent, SyntheticEvent, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { ScrollBox, Switch } from "components";
import { AdvancedSetting, renderActions, selectAdvancedSettings } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { FlightControllerParams, Internal, OrthoControllerParams, View } from "@novorender/webgl-api";

export function AdvancedSettings() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
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
        cameraNearClipping,
        cameraFarClipping,
        showPerformance,
    } = settings;

    const [far, setFar] = useState(() => {
        const d = cameraFarClipping.toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });
    const [near, setNear] = useState(() => {
        const d = (cameraNearClipping * 10000).toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });

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
            default:
                return;
        }
    };

    const handleSliderChange =
        (kind: "far" | "near") =>
        (_event: Event, value: number | number[]): void => {
            if (Array.isArray(value)) {
                return;
            }

            if (kind === "far") {
                setFar(value);
                (view.camera.controller.params as FlightControllerParams | OrthoControllerParams).far =
                    scaleFarClipping(value);
            } else {
                setNear(value);
                (view.camera.controller.params as FlightControllerParams | OrthoControllerParams).near =
                    scaleNearClipping(value);
            }

            view.performanceStatistics.cameraGeneration++;
        };

    const handleSliderCommit =
        (kind: "far" | "near") => (_event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
            if (Array.isArray(value)) {
                return;
            }

            if (kind === "far") {
                dispatch(
                    renderActions.setAdvancedSettings({ [AdvancedSetting.CameraFarClipping]: scaleFarClipping(value) })
                );
            } else {
                dispatch(
                    renderActions.setAdvancedSettings({
                        [AdvancedSetting.CameraNearClipping]: scaleNearClipping(value),
                    })
                );
            }
        };

    return (
        <ScrollBox>
            <Box mt={1} p={1} display="flex" flexDirection="column">
                <FormControlLabel
                    sx={{ ml: 0, mb: 2 }}
                    control={<Switch name={AdvancedSetting.Taa} checked={taa} onChange={handleToggle} />}
                    label={
                        <Box ml={1} fontSize={16}>
                            TAA
                        </Box>
                    }
                />
                <FormControlLabel
                    sx={{ ml: 0, mb: 2 }}
                    control={<Switch name={AdvancedSetting.Ssao} checked={ssao} onChange={handleToggle} />}
                    label={
                        <Box ml={1} fontSize={16}>
                            SSAO
                        </Box>
                    }
                />
                <FormControlLabel
                    sx={{ ml: 0, mb: 2 }}
                    control={<Switch name={AdvancedSetting.AutoFps} checked={autoFps} onChange={handleToggle} />}
                    label={
                        <Box ml={1} fontSize={16}>
                            Auto FPS
                        </Box>
                    }
                />
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
                <FormControlLabel
                    sx={{ ml: 0, mb: 2 }}
                    control={
                        <Switch name={AdvancedSetting.HoldDynamic} checked={holdDynamic} onChange={handleToggle} />
                    }
                    label={
                        <Box ml={1} fontSize={16}>
                            Hold dynamic
                        </Box>
                    }
                />
                <FormControlLabel
                    sx={{ ml: 0, mb: 2 }}
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
                <Divider />
                <Box display="flex" sx={{ my: 2 }} alignItems="center">
                    <Typography
                        sx={{
                            width: 160,
                            flexShrink: 0,
                        }}
                    >
                        Camera near clipping
                    </Typography>
                    <Slider
                        sx={{ mx: 2, flex: "1 1 100%" }}
                        min={0}
                        max={360}
                        step={1}
                        scale={scaleNearClipping}
                        name={AdvancedSetting.CameraNearClipping}
                        value={near}
                        valueLabelFormat={(value) => value.toFixed(3)}
                        valueLabelDisplay="auto"
                        onChange={handleSliderChange("near")}
                        onChangeCommitted={handleSliderCommit("near")}
                    />
                </Box>
                <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                    <Typography
                        sx={{
                            width: 160,
                            flexShrink: 0,
                        }}
                    >
                        Camera far clipping
                    </Typography>
                    <Slider
                        sx={{ mx: 2, flex: "1 1 100%" }}
                        min={180}
                        max={400}
                        step={1}
                        scale={scaleFarClipping}
                        name={AdvancedSetting.CameraFarClipping}
                        value={far}
                        valueLabelFormat={(value) => value.toFixed(0)}
                        valueLabelDisplay="auto"
                        onChange={handleSliderChange("far")}
                        onChangeCommitted={handleSliderCommit("far")}
                    />
                </Box>
                <Divider />
                <FormControlLabel
                    sx={{ mt: 2, ml: 0, mb: 2 }}
                    control={
                        <Switch
                            name={AdvancedSetting.ShowPerformance}
                            checked={showPerformance}
                            onChange={handleToggle}
                        />
                    }
                    label={
                        <Box ml={1} fontSize={16}>
                            Show stats
                        </Box>
                    }
                />
            </Box>
        </ScrollBox>
    );
}

function scaleNearClipping(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10) * 0.0001;
}

function scaleFarClipping(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10);
}

function toggleAutoFps(view: View): void {
    const { resolution } = view.settings.quality;

    if (resolution.autoAdjust) {
        resolution.autoAdjust.enabled = !resolution.autoAdjust.enabled;
        return;
    }

    view.applySettings({
        quality: {
            resolution: { autoAdjust: { enabled: true, min: 0.2, max: 1 }, value: resolution.value },
            detail: view.settings.quality.detail,
        },
    });
}

function toggleShowBoundingBox(view: View) {
    const { diagnostics } = view.settings as Internal.RenderSettingsExt;
    diagnostics.showBoundingBoxes = !diagnostics.showBoundingBoxes;
}

function toggleDoubleSidedMaterials(view: View) {
    const {
        advanced: { doubleSided },
    } = view.settings as Internal.RenderSettingsExt;

    doubleSided.opaque = !doubleSided.opaque;
}

function toggleDoubleSidedTransparentMaterials(view: View) {
    const {
        advanced: { doubleSided },
    } = view.settings as Internal.RenderSettingsExt;

    doubleSided.transparent = !doubleSided.transparent;
}

function toggleHoldDynamic(view: View) {
    const { diagnostics } = view.settings as Internal.RenderSettingsExt;

    diagnostics.holdDynamic = !diagnostics.holdDynamic;
}

function toggleTriangleBudget(view: View) {
    const { detail } = view.settings.quality;

    if (detail.autoAdjust) {
        detail.autoAdjust.enabled = !detail.autoAdjust.enabled;
        return;
    }

    view.applySettings({
        quality: {
            detail: { autoAdjust: { enabled: true, min: -1, max: 1 }, value: detail.value },
            resolution: view.settings.quality.resolution,
        },
    });
}
