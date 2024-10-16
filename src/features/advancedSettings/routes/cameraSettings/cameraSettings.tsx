import { ArrowBack, Save } from "@mui/icons-material";
import {
    Box,
    Button,
    Divider as BaseDivider,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    Typography,
    useTheme,
} from "@mui/material";
import { quat, vec3 } from "gl-matrix";
import { ChangeEvent, FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AccordionDetails, AccordionSummary, Divider, LinearProgress, Switch, WidgetBottomScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectDefaultTopDownElevation, selectTopDownSnapToAxis } from "features/orthoCam";
import {
    CameraSpeedLevel,
    CameraType,
    renderActions,
    selectCameraDefaults,
    selectCameraSpeedLevels,
    selectCameraType,
    selectProportionalCameraSpeed,
    selectViewMode,
} from "features/render";
import { ViewMode } from "types/misc";

import { AdvSettingsAccordion as Accordion } from "../../components/advSettingsAccordion";
import { Clipping } from "./clipping";

const controls = [
    { label: "Default", value: "flight" },
    { label: "CAD (right button pan)", value: "cadRightPan" },
    { label: "CAD (middle button pan)", value: "cadMiddlePan" },
    { label: "Special", value: "special" },
] as const;
const isValidControllerKind = (val: string): val is (typeof controls)[number]["value"] =>
    controls.map((c): string => c.value).includes(val);

export function CameraSettings({
    save,
    saveCameraPos,
    saving,
}: {
    save: () => Promise<void>;
    saveCameraPos: (camera: {
        kind: "pinhole" | "orthographic";
        position: vec3;
        rotation: quat;
        fov: number;
    }) => Promise<void>;
    saving: boolean;
}) {
    const { t } = useTranslation();
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const speedLevels = useAppSelector(selectCameraSpeedLevels);
    const proportionalSpeed = useAppSelector(selectProportionalCameraSpeed);
    const cameraDefaults = useAppSelector(selectCameraDefaults);
    const {
        orthographic: { touchRotate, deAcceleration, usePointerLock },
    } = cameraDefaults;
    const topDownSnapToNearestAxis = useAppSelector(selectTopDownSnapToAxis) === undefined;
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);
    const viewMode = useAppSelector(selectViewMode);
    const cameraType = useAppSelector(selectCameraType);

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
        defaultTopDownElevation !== undefined ? String(defaultTopDownElevation) : "",
    );

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
            Object.fromEntries(Object.entries(levels).map(([key, value]) => [key, String(value)])) as typeof speeds,
        );
        dispatch(renderActions.setCameraDefaults({ pinhole: { speedLevels: levels } }));
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
        dispatch(renderActions.setCameraDefaults({ pinhole: { proportionalSpeed: { min, max } } }));
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
        dispatch(renderActions.setCameraDefaults({ orthographic: { topDownElevation: elevation } }));
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
                    {t("cameraSettings")}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Clipping />
                <Accordion id="camera-movement-speed">
                    <AccordionSummary>{t("movementSpeed")}</AccordionSummary>
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
                                    {t("slow")}
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
                                    {t("default")}
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
                                    {t("fast")}
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

                <Accordion id="camera-proportional-movement-speed">
                    <AccordionSummary>{t("proportionalMovementSpeed")}</AccordionSummary>
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
                                                renderActions.setCameraDefaults({
                                                    pinhole: {
                                                        proportionalSpeed: {
                                                            enabled: !proportionalSpeed.enabled,
                                                        },
                                                    },
                                                }),
                                            );
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("enabled")}
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
                                    {t("minName")}
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
                                    {t("maxName")}
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

                <Accordion id="camera-controls">
                    <AccordionSummary>{t("controls")}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <BaseDivider sx={{ mb: 1, color: theme.palette.grey[500] }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <InputLabel id="controls-label" sx={{ color: "text.primary" }}>
                                    {t("controls")}
                                </InputLabel>
                                <Select
                                    id="camera-controls-controls"
                                    labelId="controls-label"
                                    sx={{ width: 150 }}
                                    size="small"
                                    value={cameraDefaults.pinhole.controller}
                                    name="controls"
                                    onChange={({ target: { value } }) => {
                                        if (!isValidControllerKind(value)) {
                                            return;
                                        }

                                        dispatch(renderActions.setCameraDefaults({ pinhole: { controller: value } }));

                                        if (cameraType === CameraType.Pinhole) {
                                            // Trigger new controller
                                            dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
                                        }
                                    }}
                                    input={<OutlinedInput />}
                                >
                                    {controls.map((opt) => (
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

                <Accordion id="camera-2d">
                    <AccordionSummary>{t("2d")}</AccordionSummary>
                    <AccordionDetails>
                        <Box px={1} mt={1} display={"flex"} flexDirection={"column"}>
                            <FormControlLabel
                                id="camera-2d-ortho-pointer-lock"
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        name={"orthoPointerLock"}
                                        checked={usePointerLock}
                                        onChange={() => {
                                            dispatch(
                                                renderActions.setCameraDefaults({
                                                    orthographic: { usePointerLock: !usePointerLock },
                                                }),
                                            );
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("resetPointerWhenReleased")}
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                id="camera-2d-ortho-de-acceleration"
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        name={"orthoDeAcceleration"}
                                        checked={deAcceleration}
                                        onChange={() => {
                                            dispatch(
                                                renderActions.setCameraDefaults({
                                                    orthographic: { deAcceleration: !deAcceleration },
                                                }),
                                            );
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("gradualDeceleration")}
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                id="camera-2d-ortho-touch-rotate"
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        name={"orthoTouchRotate"}
                                        checked={touchRotate}
                                        onChange={() => {
                                            dispatch(
                                                renderActions.setCameraDefaults({
                                                    orthographic: { touchRotate: !touchRotate },
                                                }),
                                            );
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("twoFingerRotation")}
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                id="camera-2d-top-down-snap-to-axis"
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        name={"topDownSnapToAxis"}
                                        checked={!topDownSnapToNearestAxis}
                                        onChange={() => {
                                            dispatch(
                                                renderActions.setCameraDefaults({
                                                    orthographic: {
                                                        topDownSnapToAxis: topDownSnapToNearestAxis
                                                            ? "north"
                                                            : undefined,
                                                    },
                                                }),
                                            );
                                        }}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("topDownPointNorth")}
                                    </Box>
                                }
                            />
                        </Box>
                        <BaseDivider sx={{ my: 1, color: theme.palette.grey[500] }} />
                        <Box px={1} component="form" onSubmit={handleDefaultTopDownElevationSubmit}>
                            <Box
                                id="camera-2d-topdown-elevation"
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <InputLabel sx={{ color: "text.primary" }} htmlFor="topdown-elevation">
                                    {t("topDownElevation")}
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
                            <FormHelperText>{t("leaveBlank")}</FormHelperText>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Button
                    sx={{ ml: 1 }}
                    disabled={saving || viewMode === ViewMode.Panorama}
                    variant="outlined"
                    color="grey"
                    onClick={async () => {
                        if (saving || view.activeController.kind === "panorama") {
                            return;
                        }

                        await saveCameraPos({
                            kind: view.renderState.camera.kind,
                            position: vec3.clone(view.renderState.camera.position),
                            rotation: quat.clone(view.renderState.camera.rotation),
                            fov: view.renderState.camera.fov,
                        });
                    }}
                >
                    {t("saveDefaultCameraPosition")}
                </Button>
            </WidgetBottomScrollBox>
        </>
    );
}

// function scaleHeadlightDistance(value: number): number {
//     return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10);
// }
