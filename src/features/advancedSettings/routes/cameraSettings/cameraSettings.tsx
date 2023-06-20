import { ArrowBack, Save } from "@mui/icons-material";
import {
    Divider as BaseDivider,
    Box,
    Button,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    SelectChangeEvent,
    Slider,
    Typography,
    useTheme,
} from "@mui/material";
import { CameraController, FlightControllerParams, OrthoControllerParams } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";
import { ChangeEvent, FormEvent, SyntheticEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary, Divider, LinearProgress, ScrollBox, Switch } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { orthoCamActions, selectDefaultTopDownElevation } from "features/orthoCam";
import {
    AdvancedSetting,
    CameraSpeedLevel,
    CameraType,
    renderActions,
    selectAdvancedSettings,
    selectCameraDefaults,
    selectCameraSpeedLevels,
    selectCameraType,
    selectPointerLock,
    selectProportionalCameraSpeed,
} from "features/render";
import { Clipping } from "./clipping";

type SliderSettings =
    | AdvancedSetting.CameraNearClipping
    | AdvancedSetting.CameraFarClipping
    | AdvancedSetting.HeadlightDistance
    | AdvancedSetting.HeadlightIntensity;

const mouseButtons = [
    { label: "Mouse L", value: 1 },
    { label: "Mouse R", value: 2 },
    { label: "Mouse M", value: 4 },
];

const touchButtons = [
    { label: "1 finger", value: 1 },
    { label: "2 fingers", value: 2 },
    { label: "3 fingers", value: 3 },
];

export function CameraSettings({
    save,
    saveCameraPos,
    saving,
}: {
    save: () => Promise<void>;
    saveCameraPos: (camera: Required<FlightControllerParams>) => Promise<void>;
    saving: boolean;
}) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const speedLevels = useAppSelector(selectCameraSpeedLevels).pinhole;
    const proportionalSpeed = useAppSelector(selectProportionalCameraSpeed);
    const settings = useAppSelector(selectAdvancedSettings);
    const { headlightIntensity, headlightDistance, mouseButtonMap, fingerMap } = settings;
    const cameraDefaults = useAppSelector(selectCameraDefaults);
    const cameraType = useAppSelector(selectCameraType);
    const pointerLock = useAppSelector(selectPointerLock).ortho;
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);

    const [distance, setDistance] = useState(() => {
        const d = headlightDistance.toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });

    const [intensity, setIntensity] = useState(headlightIntensity);

    const [speeds, setSpeeds] = useState({
        [CameraSpeedLevel.Slow]: String(speedLevels[CameraSpeedLevel.Slow]),
        [CameraSpeedLevel.Default]: String(speedLevels[CameraSpeedLevel.Default]),
        [CameraSpeedLevel.Fast]: String(speedLevels[CameraSpeedLevel.Fast]),
    });
    const [proportionalSpeedInput, setProportionalSpeedInput] = useState({
        min: String(proportionalSpeed.min),
        max: String(proportionalSpeed.max),
    });
    const [defaultTopDownElevationInput, setDefaultTopDownElevationInput] = useState(
        defaultTopDownElevation !== undefined ? String(defaultTopDownElevation) : ""
    );

    const handleSliderChange =
        (kind: SliderSettings) =>
        (_event: Event, value: number | number[]): void => {
            if (Array.isArray(value)) {
                return;
            }

            switch (kind) {
                case AdvancedSetting.HeadlightIntensity:
                    setIntensity(value);

                    view.settings.light.camera.brightness = value;
                    view.invalidateCamera();
                    return;
                case AdvancedSetting.HeadlightDistance:
                    setDistance(value);

                    view.settings.light.camera.distance = scaleHeadlightDistance(value);
                    view.invalidateCamera();
                    return;
            }
        };

    const handleSliderCommit =
        (kind: SliderSettings) => (_event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
            if (Array.isArray(value)) {
                return;
            }

            switch (kind) {
                case AdvancedSetting.HeadlightIntensity:
                    dispatch(
                        renderActions.setAdvancedSettings({
                            [AdvancedSetting.HeadlightIntensity]: value,
                        })
                    );
                    return;
                case AdvancedSetting.HeadlightDistance:
                    dispatch(
                        renderActions.setAdvancedSettings({
                            [AdvancedSetting.HeadlightDistance]: scaleHeadlightDistance(value),
                        })
                    );
                    return;
            }
        };

    const handleSpeedChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSpeeds((speed) => ({ ...speed, [e.target.name]: e.target.value.replace(",", ".") }));
    };

    const handleSpeedSubmit = (e: FormEvent | FocusEvent) => {
        if (e.type === "submit") {
            e.preventDefault();
        }

        const isValid = (num: number) => !Number.isNaN(num) && Number.isFinite(num);

        const levels = {
            [CameraSpeedLevel.Slow]: isValid(Number(speeds[CameraSpeedLevel.Slow]))
                ? Number(speeds[CameraSpeedLevel.Slow])
                : speedLevels[CameraSpeedLevel.Slow],
            [CameraSpeedLevel.Default]: isValid(Number(speeds[CameraSpeedLevel.Default]))
                ? Number(speeds[CameraSpeedLevel.Default])
                : speedLevels[CameraSpeedLevel.Default],
            [CameraSpeedLevel.Fast]: isValid(Number(speeds[CameraSpeedLevel.Fast]))
                ? Number(speeds[CameraSpeedLevel.Fast])
                : speedLevels[CameraSpeedLevel.Fast],
        };

        setSpeeds(
            Object.fromEntries(Object.entries(levels).map(([key, value]) => [key, String(value)])) as typeof speeds
        );
        dispatch(renderActions.setCameraSpeedLevels({ pinhole: levels }));
    };

    const handleProportionalSpeedSubmit = (e: FormEvent | FocusEvent) => {
        if (e.type === "submit") {
            e.preventDefault();
        }

        const isValid = (num: number) => !Number.isNaN(num) && Number.isFinite(num);

        const min = isValid(Number(proportionalSpeedInput.min))
            ? Number(proportionalSpeedInput.min)
            : proportionalSpeed.min;
        const max = isValid(Number(proportionalSpeedInput.max))
            ? Number(proportionalSpeedInput.max)
            : proportionalSpeed.max;

        setProportionalSpeedInput({ min: String(min), max: String(max) });
        dispatch(renderActions.setProportionalCameraSpeed({ min, max }));
    };

    const handleMouseControllerChange = ({ target: { name, value } }: SelectChangeEvent<number>) => {
        const swapped = Object.entries(mouseButtonMap)
            .filter(([_key, val]) => {
                return val === value;
            })
            .reduce(
                (prev, [key]) => {
                    return {
                        ...prev,
                        [key]: mouseButtonMap[name as keyof typeof mouseButtonMap],
                    };
                },
                {
                    ...mouseButtonMap,
                    [name]: value,
                    ...(name === "pivot" ? { orbit: value } : {}),
                } as CameraController["mouseButtonsMap"]
            );

        dispatch(renderActions.setAdvancedSettings({ mouseButtonMap: swapped }));
    };

    const handleTouchControllerChange = ({ target: { name, value } }: SelectChangeEvent<number>) => {
        const swapped = Object.entries(fingerMap)
            .filter(([_key, val]) => val === value)
            .reduce(
                (prev, [key]) => {
                    return {
                        ...prev,
                        [key]: fingerMap[name as keyof typeof fingerMap],
                    };
                },
                {
                    ...fingerMap,
                    [name]: value,
                    ...(name === "pivot" ? { orbit: value } : {}),
                } as CameraController["fingersMap"]
            );

        dispatch(renderActions.setAdvancedSettings({ fingerMap: swapped }));
    };

    const handleDefaultTopDownElevationSubmit = (e: FormEvent | FocusEvent) => {
        if (e.type === "submit") {
            e.preventDefault();
        }

        const isValid = (num: number) => !Number.isNaN(num) && Number.isFinite(num);

        const elevation = defaultTopDownElevationInput
            ? isValid(Number(defaultTopDownElevationInput))
                ? Number(defaultTopDownElevationInput)
                : defaultTopDownElevation
            : undefined;

        setDefaultTopDownElevationInput(elevation !== undefined ? String(elevation) : "");
        dispatch(orthoCamActions.setDefaultTopDownElevation(elevation));
    };

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
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} mt={1} pb={3}>
                {/*
                TODO
                 <Accordion>
                    <AccordionSummary>Headlight</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    Headlight intensity
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    name={AdvancedSetting.HeadlightIntensity}
                                    value={intensity}
                                    valueLabelDisplay="auto"
                                    onChange={handleSliderChange(AdvancedSetting.HeadlightIntensity)}
                                    onChangeCommitted={handleSliderCommit(AdvancedSetting.HeadlightIntensity)}
                                />
                            </Box>
                            <Box display="flex" alignItems="center">
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    Headlight distance
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={0}
                                    max={220}
                                    step={1}
                                    scale={scaleHeadlightDistance}
                                    name={AdvancedSetting.HeadlightDistance}
                                    value={distance}
                                    valueLabelDisplay="auto"
                                    onChange={handleSliderChange(AdvancedSetting.HeadlightDistance)}
                                    onChangeCommitted={handleSliderCommit(AdvancedSetting.HeadlightDistance)}
                                />
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion> */}
                <Clipping />
                <Accordion>
                    <AccordionSummary>Movement speed</AccordionSummary>
                    <AccordionDetails>
                        <Box
                            p={1}
                            display="flex"
                            flexDirection="column"
                            component="form"
                            noValidate
                            onSubmit={handleSpeedSubmit}
                        >
                            <BaseDivider sx={{ mb: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="slowSpeed">
                                    Slow:
                                </InputLabel>
                                <OutlinedInput
                                    id="slowSpeed"
                                    name={CameraSpeedLevel.Slow}
                                    value={speeds[CameraSpeedLevel.Slow]}
                                    onChange={handleSpeedChange}
                                    onBlur={handleSpeedSubmit}
                                    size="small"
                                    sx={{ maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="defaultSpeed">
                                    Default:
                                </InputLabel>
                                <OutlinedInput
                                    id="defaultSpeed"
                                    name={CameraSpeedLevel.Default}
                                    value={speeds[CameraSpeedLevel.Default]}
                                    onChange={handleSpeedChange}
                                    onBlur={handleSpeedSubmit}
                                    size="small"
                                    sx={{ maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="fastSpeed">
                                    Fast:
                                </InputLabel>
                                <OutlinedInput
                                    id="fastSpeed"
                                    name={CameraSpeedLevel.Fast}
                                    value={speeds[CameraSpeedLevel.Fast]}
                                    onChange={handleSpeedChange}
                                    onBlur={handleSpeedSubmit}
                                    size="small"
                                    sx={{ maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <input type="submit" hidden />
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary>Proportional movement speed</AccordionSummary>
                    <AccordionDetails>
                        <Box px={1} mt={1}>
                            <FormControlLabel
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        name={"proportionalSpeed"}
                                        checked={proportionalSpeed.enabled}
                                        onChange={() => {
                                            dispatch(
                                                renderActions.setProportionalCameraSpeed({
                                                    enabled: !proportionalSpeed.enabled,
                                                })
                                            );
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Enabled
                                    </Box>
                                }
                            />
                        </Box>
                        <Box
                            px={1}
                            display="flex"
                            flexDirection="column"
                            component="form"
                            noValidate
                            onSubmit={handleProportionalSpeedSubmit}
                        >
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="proportional-speed_min">
                                    Min:
                                </InputLabel>
                                <OutlinedInput
                                    id="proportional-speed_min"
                                    name={"proportional-speed_min"}
                                    value={proportionalSpeedInput.min}
                                    onChange={(e) =>
                                        setProportionalSpeedInput((state) => ({
                                            ...state,
                                            min: e.target.value.replace(",", "."),
                                        }))
                                    }
                                    onBlur={handleProportionalSpeedSubmit}
                                    disabled={!proportionalSpeed.enabled}
                                    size="small"
                                    sx={{ maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="proportional-speed_max">
                                    Max:
                                </InputLabel>
                                <OutlinedInput
                                    id="proportional-speed_max"
                                    name={"proportional-speed_max"}
                                    value={proportionalSpeedInput.max}
                                    onChange={(e) =>
                                        setProportionalSpeedInput((state) => ({
                                            ...state,
                                            max: e.target.value.replace(",", "."),
                                        }))
                                    }
                                    onBlur={handleProportionalSpeedSubmit}
                                    disabled={!proportionalSpeed.enabled}
                                    size="small"
                                    sx={{ maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <input type="submit" hidden />
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary>Controls</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <BaseDivider sx={{ mb: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Rotate around object:</InputLabel>
                                <Select
                                    sx={{ width: 150 }}
                                    name="pivot"
                                    size="small"
                                    disabled={cameraType !== CameraType.Pinhole}
                                    value={mouseButtonMap.pivot}
                                    onChange={handleMouseControllerChange}
                                    input={<OutlinedInput />}
                                >
                                    {mouseButtons.map((opt) => (
                                        <MenuItem key={opt.label} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Change direction:</InputLabel>
                                <Select
                                    sx={{ width: 150 }}
                                    name="rotate"
                                    size="small"
                                    disabled={cameraType !== CameraType.Pinhole}
                                    value={mouseButtonMap.rotate}
                                    onChange={handleMouseControllerChange}
                                    input={<OutlinedInput />}
                                >
                                    {mouseButtons.map((opt) => (
                                        <MenuItem key={opt.label} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Pan:</InputLabel>
                                <Select
                                    sx={{ width: 150 }}
                                    name="pan"
                                    size="small"
                                    disabled={cameraType !== CameraType.Pinhole}
                                    value={mouseButtonMap.pan}
                                    onChange={handleMouseControllerChange}
                                    input={<OutlinedInput />}
                                >
                                    {mouseButtons.map((opt) => (
                                        <MenuItem key={opt.label} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                        </Box>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary>Touch controls</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <BaseDivider sx={{ mb: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Rotate around object:</InputLabel>
                                <Select
                                    sx={{ width: 150 }}
                                    name="pivot"
                                    size="small"
                                    disabled={cameraType !== CameraType.Pinhole}
                                    value={fingerMap.pivot}
                                    onChange={handleTouchControllerChange}
                                    input={<OutlinedInput />}
                                >
                                    {touchButtons.map((opt) => (
                                        <MenuItem key={opt.label} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Change direction:</InputLabel>
                                <Select
                                    sx={{ width: 150 }}
                                    name="rotate"
                                    size="small"
                                    disabled={cameraType !== CameraType.Pinhole}
                                    value={fingerMap.rotate}
                                    onChange={handleTouchControllerChange}
                                    input={<OutlinedInput />}
                                >
                                    {touchButtons.map((opt) => (
                                        <MenuItem key={opt.label} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Pan</InputLabel>
                                <Select
                                    sx={{ width: 150 }}
                                    name="pan"
                                    size="small"
                                    disabled={cameraType !== CameraType.Pinhole}
                                    value={fingerMap.pan}
                                    onChange={handleTouchControllerChange}
                                    input={<OutlinedInput />}
                                >
                                    {touchButtons.map((opt) => (
                                        <MenuItem key={opt.label} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary>2D</AccordionSummary>
                    <AccordionDetails>
                        <Box px={1} mt={1}>
                            <FormControlLabel
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        name={"orthoPointerLock"}
                                        checked={pointerLock}
                                        onChange={() => {
                                            dispatch(renderActions.setPointerLock({ ortho: !pointerLock }));
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Reset pointer when released
                                    </Box>
                                }
                            />
                        </Box>
                        <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                        <Box px={1} component="form" onSubmit={handleDefaultTopDownElevationSubmit}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="topdown-elevation">
                                    Top-down elevation (meters):
                                </InputLabel>
                                <OutlinedInput
                                    id="topdown-elevation"
                                    name={"topdown-elevation"}
                                    value={defaultTopDownElevationInput}
                                    onChange={(e) => {
                                        setDefaultTopDownElevationInput(e.target.value.replace(",", "."));
                                    }}
                                    onBlur={handleDefaultTopDownElevationSubmit}
                                    size="small"
                                    sx={{ maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                />
                            </Box>
                            <FormHelperText>Leave blank to use current camera elevation.</FormHelperText>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Button
                    disabled={cameraType !== CameraType.Pinhole}
                    variant="outlined"
                    color="grey"
                    sx={{ ml: 1, my: 2 }}
                    onClick={async () => {
                        if (view.camera.controller.params.kind === "flight") {
                            await saveCameraPos(view.camera.controller.params);
                            dispatch(
                                renderActions.setHomeCameraPos({
                                    position: vec3.clone(view.camera.position),
                                    rotation: quat.clone(view.camera.rotation),
                                })
                            );
                        }
                    }}
                >
                    Save default camera position
                </Button>
            </ScrollBox>
        </>
    );
}

function scaleHeadlightDistance(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10);
}
