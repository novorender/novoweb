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
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionSummary, IosSwitch } from "components";
import { ObjectVisibility, Picker, renderActions, selectPicker } from "features/render";
import { radToDeg } from "utils/math";

import { formsGlobalsActions } from "../formsGlobals";
import { useDispatchFormsGlobals, useFormsGlobals } from "../formsGlobals/hooks";
import { selectCurrentFormsList, selectSelectedFormId } from "../slice";
import { type Form } from "../types";

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

export function TransformEditor({ disabled, form }: { disabled?: boolean; form?: Partial<Form> }) {
    const { t } = useTranslation();
    const selectedTemplateId = useAppSelector(selectCurrentFormsList);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const isPickingLocation = useAppSelector(selectPicker) === Picker.FormLocation;
    const isPickingLocationRef = useRef(isPickingLocation);
    isPickingLocationRef.current = isPickingLocation;
    const dispatch = useAppDispatch();
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const transformDraft = useFormsGlobals().transformDraft;
    const originalTransformDraft = useRef(transformDraft);
    const latestDispatchedTransformDraft = useRef(transformDraft);
    const willUnmount = useRef(false);

    useEffect(() => {
        willUnmount.current = true;
        return () => {
            willUnmount.current = false;
        };
    });

    const [transform, setTransform] = useState(
        toTransformState(
            form?.location ?? transformDraft?.location,
            form?.rotation ?? transformDraft?.rotation,
            form?.scale ?? transformDraft?.scale,
        ),
    );

    useEffect(() => {
        if (!originalTransformDraft.current) {
            originalTransformDraft.current = transformDraft;
            latestDispatchedTransformDraft.current = transformDraft;
            setTransform(toTransformState(transformDraft?.location, transformDraft?.rotation, transformDraft?.scale));
        }

        // Prevent updating local transform based on updates made in the component,
        // because it messes up input in the text fields
        if (!form && transformDraft !== latestDispatchedTransformDraft.current) {
            setTransform(toTransformState(transformDraft?.location, transformDraft?.rotation, transformDraft?.scale));
        }
    }, [transformDraft, form]);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(undefined));
                if (isPickingLocationRef.current) {
                    dispatch(renderActions.stopPicker(Picker.FormLocation));
                }
            }
        };
    }, [dispatch, dispatchFormsGlobals]);

    const updateTransform = useCallback(
        (update: Partial<typeof transform>) => {
            if (!selectedTemplateId || !selectedFormId) {
                return;
            }

            const newTransform = { ...transform, ...update };
            setTransform(newTransform);
            const rotation = computeRotation(newTransform.roll, newTransform.pitch, newTransform.yaw);
            const newTransformDraft = {
                templateId: selectedTemplateId,
                formId: selectedFormId,
                location: vec3.fromValues(newTransform.x, newTransform.y, newTransform.z),
                rotation,
                scale: newTransform.scale,
                updated: true,
            };
            latestDispatchedTransformDraft.current = newTransformDraft;
            dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(newTransformDraft));
        },
        [transform, dispatchFormsGlobals, selectedTemplateId, selectedFormId],
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
        if (!selectedTemplateId || !selectedFormId) {
            return;
        }

        const transform = originalTransformDraft.current!;
        dispatchFormsGlobals(
            formsGlobalsActions.setTransformDraft({
                templateId: selectedTemplateId,
                formId: selectedFormId,
                location: transform.location,
                rotation: transform.rotation,
                scale: transform.scale,
                updated: false,
            }),
        );
    }, [dispatchFormsGlobals, selectedTemplateId, selectedFormId]);

    return (
        <Accordion>
            <AccordionSummary>{t("transformation")}</AccordionSummary>
            <AccordionDetails>
                <Stack gap={4} sx={{ mt: 2 }}>
                    <Stack gap={1}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography fontWeight={600}>{t("position")}</Typography>
                            {!form && (
                                <FormControlLabel
                                    control={
                                        <IosSwitch
                                            size="medium"
                                            color="primary"
                                            checked={Boolean(selectedFormId) && isPickingLocation}
                                            onChange={pickNewLocation}
                                        />
                                    }
                                    disabled={disabled}
                                    label={<Box fontSize={14}>{t("move")}</Box>}
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>
                        <Stack direction="row" gap={2}>
                            <TextField
                                value={transform.x}
                                onChange={(e) => updateTransform({ x: (e.target as HTMLInputElement).valueAsNumber })}
                                type="number"
                                size="small"
                                label="X"
                                variant="outlined"
                                disabled={disabled || !!form}
                            />
                            <TextField
                                value={transform.y}
                                onChange={(e) => updateTransform({ y: (e.target as HTMLInputElement).valueAsNumber })}
                                type="number"
                                size="small"
                                label="Y"
                                variant="outlined"
                                disabled={disabled || !!form}
                            />
                            <TextField
                                value={transform.z}
                                onChange={(e) => updateTransform({ z: (e.target as HTMLInputElement).valueAsNumber })}
                                type="number"
                                size="small"
                                label="Z"
                                variant="outlined"
                                disabled={disabled || !!form}
                            />
                        </Stack>
                    </Stack>
                    <TextField
                        sx={{ maxWidth: 173 }}
                        value={transform.scale}
                        onChange={(e) => updateTransform({ scale: (e.target as HTMLInputElement).valueAsNumber })}
                        type="number"
                        inputProps={{ step: "0.1" }}
                        size="small"
                        label="Scale"
                        variant="outlined"
                        disabled={disabled || !!form}
                    />
                    <Stack gap={1}>
                        <Typography fontWeight={600}>{t("rotation")}</Typography>
                        <Stack gap={6}>
                            <RotationComponentInput
                                title="Roll (X)"
                                value={transform.roll}
                                onChange={(roll) => updateTransform({ roll })}
                                disabled={disabled || !!form}
                            />
                            <RotationComponentInput
                                title="Pitch (Y)"
                                value={transform.pitch}
                                onChange={(pitch) => updateTransform({ pitch })}
                                disabled={disabled || !!form}
                            />
                            <RotationComponentInput
                                title="Yaw (Z)"
                                value={transform.yaw}
                                onChange={(yaw) => updateTransform({ yaw })}
                                disabled={disabled || !!form}
                            />
                        </Stack>
                    </Stack>
                    {!form && (
                        <Box display="flex" justifyContent="end" gap={1}>
                            <Button type="button" onClick={handleReset} disabled={disabled}>
                                {t("reset")}
                            </Button>
                        </Box>
                    )}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}

function RotationComponentInput({
    title,
    value,
    onChange,
    disabled,
}: {
    title: string;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}) {
    return (
        <Stack spacing={2} direction="row" sx={{ mb: 1, width: 1 }} alignItems="center">
            <Typography minWidth={62}>{title}</Typography>
            <IconButton
                disabled={value <= -180 || disabled}
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
                disabled={disabled}
            />
            <IconButton
                onClick={() => {
                    onChange(value + 1);
                }}
                disabled={value >= 180 || disabled}
                size="small"
            >
                <AddCircleOutline fontSize="small" />
            </IconButton>
            <TextField
                value={value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(event.target.value === "" ? 0 : event.target.valueAsNumber);
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
                disabled={disabled}
            />
        </Stack>
    );
}

function toTransformState(
    position: ReadonlyVec3 | undefined,
    rotation: ReadonlyQuat | undefined,
    scale: number | undefined,
) {
    const { roll, pitch, yaw } = rotation ? decomposeRotation(rotation) : { roll: 0, pitch: 0, yaw: 0 };

    return {
        x: Number(`${(position?.[0] ?? 0).toFixed(POSITION_PRECISION)}`),
        y: Number(`${(position?.[1] ?? 0).toFixed(POSITION_PRECISION)}`),
        z: Number(`${(position?.[2] ?? 0).toFixed(POSITION_PRECISION)}`),
        scale: Number(`${(scale ?? 1).toFixed(SCALE_PRECISION)}`),
        roll: Number(radToDeg(roll).toFixed(3)),
        pitch: Number(radToDeg(pitch).toFixed(3)),
        yaw: Number(radToDeg(yaw).toFixed(3)),
    };
}
