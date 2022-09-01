import { useState, SyntheticEvent, ChangeEvent, FormEvent } from "react";
import { CameraController, FlightControllerParams, OrthoControllerParams } from "@novorender/webgl-api";
import { useHistory } from "react-router-dom";
import {
    useTheme,
    Box,
    Button,
    Slider,
    Typography,
    InputAdornment,
    OutlinedInput,
    InputLabel,
    Select,
    MenuItem,
    Divider as BaseDivider,
    SelectChangeEvent,
} from "@mui/material";
import { ArrowBack, Edit, Save } from "@mui/icons-material";
import { quat, vec3 } from "gl-matrix";

import { Divider, ScrollBox, Accordion, AccordionDetails, AccordionSummary, LinearProgress } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    AdvancedSetting,
    selectAdvancedSettings,
    renderActions,
    selectBaseCameraSpeed,
    CameraSpeedMultiplier,
    selectCameraType,
    CameraType,
} from "slices/renderSlice";

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
    const baseSpeed = useAppSelector(selectBaseCameraSpeed);
    const settings = useAppSelector(selectAdvancedSettings);
    const { cameraNearClipping, cameraFarClipping, headlightIntensity, headlightDistance, mouseButtonMap, fingerMap } =
        settings;
    const cameraType = useAppSelector(selectCameraType);

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
    const [distance, setDistance] = useState(() => {
        const d = headlightDistance.toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });
    const [intensity, setIntensity] = useState(headlightIntensity);
    const [speed, setSpeed] = useState(String(baseSpeed));

    const handleSliderChange =
        (kind: SliderSettings) =>
        (_event: Event, value: number | number[]): void => {
            if (Array.isArray(value)) {
                return;
            }

            switch (kind) {
                case AdvancedSetting.CameraFarClipping:
                    setFar(value);

                    (view.camera.controller.params as FlightControllerParams | OrthoControllerParams).far =
                        scaleFarClipping(value);
                    view.performanceStatistics.cameraGeneration++;
                    return;
                case AdvancedSetting.CameraNearClipping:
                    setNear(value);

                    (view.camera.controller.params as FlightControllerParams | OrthoControllerParams).near =
                        scaleNearClipping(value);
                    view.performanceStatistics.cameraGeneration++;
                    return;
                case AdvancedSetting.HeadlightIntensity:
                    setIntensity(value);

                    view.settings.light.camera.brightness = value;
                    view.performanceStatistics.cameraGeneration++;
                    return;
                case AdvancedSetting.HeadlightDistance:
                    setDistance(value);

                    view.settings.light.camera.distance = scaleHeadlightDistance(value);
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
                case AdvancedSetting.CameraFarClipping:
                    dispatch(
                        renderActions.setAdvancedSettings({
                            [AdvancedSetting.CameraFarClipping]: scaleFarClipping(value),
                        })
                    );
                    return;
                case AdvancedSetting.CameraNearClipping:
                    dispatch(
                        renderActions.setAdvancedSettings({
                            [AdvancedSetting.CameraNearClipping]: scaleNearClipping(value),
                        })
                    );
                    return;
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
        setSpeed(e.target.value);
    };

    const handleSpeedSubmit = (e: FormEvent | FocusEvent) => {
        if (e.type === "submit") {
            e.preventDefault();
        }

        const val = Number(speed);

        if (Number.isNaN(val) || !Number.isFinite(val)) {
            setSpeed(String(baseSpeed));
        } else {
            dispatch(renderActions.setBaseCameraSpeed(val));
        }
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
            <ScrollBox height={1} mt={1} pb={3}>
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
                </Accordion>
                <Accordion>
                    <AccordionSummary>Clipping</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    Near clipping
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={0}
                                    max={360}
                                    step={1}
                                    disabled={cameraType !== CameraType.Flight}
                                    scale={scaleNearClipping}
                                    name={AdvancedSetting.CameraNearClipping}
                                    value={near}
                                    valueLabelFormat={(value) => value.toFixed(3)}
                                    valueLabelDisplay="auto"
                                    onChange={handleSliderChange(AdvancedSetting.CameraNearClipping)}
                                    onChangeCommitted={handleSliderCommit(AdvancedSetting.CameraNearClipping)}
                                />
                            </Box>
                            <Box display="flex" alignItems="center">
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    Far clipping
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={180}
                                    max={400}
                                    step={1}
                                    disabled={cameraType !== CameraType.Flight}
                                    scale={scaleFarClipping}
                                    name={AdvancedSetting.CameraFarClipping}
                                    value={far}
                                    valueLabelFormat={(value) => value.toFixed(0)}
                                    valueLabelDisplay="auto"
                                    onChange={handleSliderChange(AdvancedSetting.CameraFarClipping)}
                                    onChangeCommitted={handleSliderCommit(AdvancedSetting.CameraFarClipping)}
                                />
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
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
                                <InputLabel sx={{ color: "text.primary" }}>Slow:</InputLabel>
                                <OutlinedInput
                                    sx={{ maxWidth: 150 }}
                                    value={(baseSpeed * CameraSpeedMultiplier.Slow).toFixed(2)}
                                    color="secondary"
                                    size="small"
                                    readOnly
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="baseSpeed">
                                    Base:
                                </InputLabel>
                                <OutlinedInput
                                    id="baseSpeed"
                                    value={speed}
                                    onChange={handleSpeedChange}
                                    onBlur={handleSpeedSubmit}
                                    size="small"
                                    sx={{ fontWeight: 600, maxWidth: 150 }}
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9.]*" }}
                                    autoFocus
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <Edit fontSize="small" />
                                        </InputAdornment>
                                    }
                                />
                            </Box>
                            <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel sx={{ color: "text.primary" }}>Fast:</InputLabel>
                                <OutlinedInput
                                    value={(baseSpeed * CameraSpeedMultiplier.Fast).toFixed(2)}
                                    sx={{ maxWidth: 150 }}
                                    color="secondary"
                                    size="small"
                                    readOnly
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
                                    disabled={cameraType !== CameraType.Flight}
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
                                    disabled={cameraType !== CameraType.Flight}
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
                                    disabled={cameraType !== CameraType.Flight}
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
                                    disabled={cameraType !== CameraType.Flight}
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
                                    disabled={cameraType !== CameraType.Flight}
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
                                    disabled={cameraType !== CameraType.Flight}
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

                <Button
                    disabled={cameraType !== CameraType.Flight}
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

function scaleNearClipping(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10) * 0.0001;
}

function scaleFarClipping(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10);
}

const scaleHeadlightDistance = scaleFarClipping;
