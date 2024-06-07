import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import {
    AccordionDetails,
    Box,
    Button,
    FormControlLabel,
    IconButton,
    Slider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { computeRotation } from "@novorender/api";
import { decomposeRotation } from "@novorender/api/web_app/controller/orientation";
import { ReadonlyQuat, ReadonlyVec3, vec3 } from "gl-matrix";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionSummary, IosSwitch } from "components";
import { ObjectVisibility, Picker, renderActions, selectPicker } from "features/render";
import { radToDeg } from "utils/math";

import { formsGlobalsActions } from "../formsGlobals";
import { useDispatchFormsGlobals, useFormsGlobals } from "../formsGlobals/hooks";
import { selectSelectedFormId } from "../slice";

const POSITION_PRECISION = 2;
const SCALE_PRECISION = 3;

const marks = [
    {
        value: -180,
        label: "-180°",
    },
    {
        value: 0,
        label: "0°",
    },
    {
        value: 180,
        label: "180°",
    },
];

export function TransformEditor() {
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const isPickingLocation = useAppSelector(selectPicker) === Picker.FormLocation;
    const isPickingLocationRef = useRef(isPickingLocation);
    isPickingLocationRef.current = isPickingLocation;
    const dispatch = useAppDispatch();
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const transformDraft = useFormsGlobals().transformDraft;
    const originalTransformDraft = useRef(transformDraft);
    if (!originalTransformDraft.current) {
        originalTransformDraft.current = transformDraft;
    }
    const latestDispatchedTransformDraft = useRef(transformDraft);

    const [transform, setTransform] = useState(
        toTransformState(transformDraft?.location, transformDraft?.rotation, transformDraft?.scale)
    );

    useEffect(() => {
        // Prevent updating local transform based on updates made in the component,
        // becauses it messes up input in the text fields
        if (transformDraft !== latestDispatchedTransformDraft.current) {
            setTransform(toTransformState(transformDraft?.location, transformDraft?.rotation, transformDraft?.scale));
        }
    }, [transformDraft]);

    useEffect(() => {
        return () => {
            dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(undefined));
            if (isPickingLocationRef.current) {
                dispatch(renderActions.stopPicker(Picker.FormLocation));
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
            }
        };
    }, [dispatch, dispatchFormsGlobals]);

    const updateTransform = useCallback(
        (update: Partial<typeof transform>) => {
            const newTransform = { ...transform, ...update };
            setTransform(newTransform);
            const rotation = computeRotation(newTransform.roll, newTransform.pitch, newTransform.yaw);
            const newTransformDraft = {
                location: vec3.fromValues(Number(newTransform.x), Number(newTransform.y), Number(newTransform.z)),
                rotation,
                scale: Number(newTransform.scale),
                updated: true,
            };
            latestDispatchedTransformDraft.current = newTransformDraft;
            dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(newTransformDraft));
        },
        [transform, dispatchFormsGlobals]
    );

    const pickNewLocation = useCallback(() => {
        if (isPickingLocation) {
            dispatch(renderActions.stopPicker(Picker.FormLocation));
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        } else {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            dispatch(renderActions.setPicker(Picker.FormLocation));
        }
    }, [dispatch, isPickingLocation]);

    const handleReset = useCallback(() => {
        const transform = originalTransformDraft.current!;
        dispatchFormsGlobals(
            formsGlobalsActions.setTransformDraft({
                location: transform.location,
                rotation: transform.rotation,
                scale: transform.scale,
                updated: false,
            })
        );
    }, [dispatchFormsGlobals]);

    return (
        <Accordion>
            <AccordionSummary>Transformation</AccordionSummary>
            <AccordionDetails>
                <Stack gap={4} sx={{ mt: 2 }}>
                    <Stack gap={1}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography fontWeight={600}>Position</Typography>
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={Boolean(selectedFormId) && isPickingLocation}
                                        onChange={pickNewLocation}
                                    />
                                }
                                label={<Box fontSize={14}>Pick</Box>}
                                sx={{ ml: 1 }}
                            />
                        </Box>
                        <Stack direction="row" gap={2}>
                            <TextField
                                value={transform.x}
                                onChange={(e) => updateTransform({ x: e.target.value })}
                                type="number"
                                size="small"
                                label="X"
                                variant="outlined"
                            />
                            <TextField
                                value={transform.y}
                                onChange={(e) => updateTransform({ y: e.target.value })}
                                type="number"
                                size="small"
                                label="Y"
                                variant="outlined"
                            />
                            <TextField
                                value={transform.z}
                                onChange={(e) => updateTransform({ z: e.target.value })}
                                type="number"
                                size="small"
                                label="Z"
                                variant="outlined"
                            />
                        </Stack>
                    </Stack>
                    <TextField
                        sx={{ maxWidth: 173 }}
                        value={transform.scale}
                        onChange={(e) => updateTransform({ scale: e.target.value })}
                        type="number"
                        inputProps={{ step: "0.1" }}
                        size="small"
                        label="Scale"
                        variant="outlined"
                    />
                    <Stack gap={1}>
                        <Typography fontWeight={600}>Rotation</Typography>
                        <Stack gap={6}>
                            <RotationComponentInput
                                title="Roll (X)"
                                value={transform.roll}
                                onChange={(roll) => updateTransform({ roll })}
                            />
                            <RotationComponentInput
                                title="Pitch (Y)"
                                value={transform.pitch}
                                onChange={(pitch) => updateTransform({ pitch })}
                            />
                            <RotationComponentInput
                                title="Yaw (Z)"
                                value={transform.yaw}
                                onChange={(yaw) => updateTransform({ yaw })}
                            />
                        </Stack>
                    </Stack>
                    <Box display="flex" justifyContent="end" gap={1}>
                        <Button type="button" onClick={handleReset}>
                            Reset
                        </Button>
                    </Box>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}

function RotationComponentInput({
    title,
    value,
    onChange,
}: {
    title: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <Stack spacing={2} direction="row" sx={{ mb: 1, width: 1 }} alignItems="center">
            <Typography minWidth={62}>{title}</Typography>
            <IconButton
                disabled={value <= -180}
                onClick={() => {
                    onChange(value - 1);
                }}
                size="small"
            >
                <RemoveCircleOutline fontSize="small" />
            </IconButton>
            <Slider
                min={-180}
                max={180}
                value={value}
                onChange={(event: Event, newValue: number | number[]) => {
                    onChange(newValue as number);
                }}
                valueLabelDisplay="auto"
                marks={marks}
            />
            <IconButton
                onClick={() => {
                    onChange(value + 1);
                }}
                disabled={value >= 180}
                size="small"
            >
                <AddCircleOutline fontSize="small" />
            </IconButton>
            <TextField
                value={value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(event.target.value === "" ? 0 : Number(event.target.value));
                }}
                onBlur={() => {
                    if (value < -180) {
                        onChange(-180);
                    } else if (value > 180) {
                        onChange(180);
                    }
                }}
                type="number"
                size="small"
                variant="outlined"
                sx={{ minWidth: 80 }}
                inputProps={{
                    min: -180,
                    max: 180,
                    type: "number",
                }}
            />
        </Stack>
    );
}

function toTransformState(
    position: ReadonlyVec3 | undefined,
    rotation: ReadonlyQuat | undefined,
    scale: number | undefined
) {
    const { roll, pitch, yaw } = rotation ? decomposeRotation(rotation) : { roll: 0, pitch: 0, yaw: 0 };

    return {
        x: `${(position?.[0] ?? 0).toFixed(POSITION_PRECISION)}`,
        y: `${(position?.[1] ?? 0).toFixed(POSITION_PRECISION)}`,
        z: `${(position?.[2] ?? 0).toFixed(POSITION_PRECISION)}`,
        scale: `${(scale ?? 1).toFixed(SCALE_PRECISION)}`,
        roll: Number(radToDeg(roll).toFixed(3)),
        pitch: Number(radToDeg(pitch).toFixed(3)),
        yaw: Number(radToDeg(yaw).toFixed(3)),
    };
}
