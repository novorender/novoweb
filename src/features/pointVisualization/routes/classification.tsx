import { Add, Delete } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ColorPicker } from "features/colorPicker";
import { LabeledKnot, renderActions, selectClassificationColorGradient } from "features/render";
import { rgbToVec, VecRGBA } from "utils/color";

import ColorIcon from "../components/colorIcon";
import { selectPointVisualizationOriginalState } from "../selectors";

export function ClassificationView() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const isEditing = useAppSelector(selectPointVisualizationOriginalState) !== undefined;
    const originalGradient = useAppSelector(selectClassificationColorGradient);
    const [gradient, setGradient] = useState(originalGradient);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dispatch = useAppDispatch();

    const updateGradient = (newGradient: typeof gradient) => {
        setGradient(newGradient);

        const knots = newGradient.knots.filter((k) => Number.isFinite(k.position));
        dispatch(
            renderActions.setPoints({
                classificationColorGradient: { ...newGradient, knots },
                defaultPointVisualization: { kind: "classification" },
            }),
        );
    };

    const setKnots = (knots: LabeledKnot[]) => {
        updateGradient({ ...gradient, knots });
    };

    const updateKnot = (knot: LabeledKnot, i: number) => {
        setKnots(gradient.knots.with(i, knot));
    };

    const deleteKnot = (index: number) => {
        setKnots(gradient.knots.filter((_, i) => i !== index));
    };

    const addKnot = () => {
        let position = -1;
        for (const knot of gradient.knots) {
            if (knot.position > position) {
                position = knot.position;
            }
        }
        position += 1;

        setKnots([...gradient.knots, { position, label: "", color: [0, 0, 0, 1] }]);

        setTimeout(() => {
            let input: HTMLInputElement | undefined;
            containerRef.current?.querySelectorAll("[data-code-input] input").forEach((e) => {
                input = e as HTMLInputElement;
            });
            input?.focus();
        });
    };

    return (
        <>
            <ScrollBox p={2} ref={containerRef}>
                <Stack gap={2}>
                    {isEditing ? (
                        <>
                            <UndefinedColorPicker
                                color={gradient.undefinedColor}
                                onChange={(color) => updateGradient({ ...gradient, undefinedColor: color })}
                            />

                            {gradient.knots.map((knot, i) => (
                                <KnotInput
                                    key={i}
                                    knot={knot}
                                    onChange={(knot) => updateKnot(knot, i)}
                                    onDelete={() => deleteKnot(i)}
                                />
                            ))}
                            <Box sx={{ display: "flex", justifyContent: "center" }}>
                                <Button variant="outlined" sx={{ fontWeight: 600 }} size="large" onClick={addKnot}>
                                    <Add sx={{ mr: 1 }} /> {t("addClassification")}
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <>
                            <KnotView label={t("undefinedColor")} color={gradient.undefinedColor} />
                            {gradient.knots.length === 0 && (
                                <Typography color="grey" textAlign="center">
                                    {t("noColorStopsDefined")}
                                </Typography>
                            )}
                            {gradient.knots.map((knot, i) => (
                                <KnotView
                                    key={i}
                                    label={knot.position.toFixed(0) + (knot.label ? ` - ${knot.label}` : "")}
                                    color={knot.color}
                                    onPointerEnter={() => {
                                        const knots = gradient.knots.map((k2, j) => ({
                                            position: k2.position,
                                            color: i === j ? knot.color : ([0, 0, 0, 0] as VecRGBA),
                                        }));
                                        view.modifyRenderState({
                                            points: {
                                                classificationColorGradient: { knots },
                                            },
                                        });
                                    }}
                                    onPointerLeave={() => {
                                        view.modifyRenderState({
                                            points: {
                                                classificationColorGradient: {
                                                    knots: gradient.knots.map(({ label: _label, ...knot }) => knot),
                                                },
                                            },
                                        });
                                    }}
                                />
                            ))}
                        </>
                    )}
                </Stack>
            </ScrollBox>
        </>
    );
}

function KnotView({
    label,
    color,
    onPointerEnter,
    onPointerLeave,
}: {
    label: ReactNode;
    color: VecRGBA;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
}) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px", alignItems: "center", gap: 1 }}>
            <Typography>{label}</Typography>
            <div onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
                <ColorIcon iconColor={color} />
            </div>
        </Box>
    );
}

function KnotInput({
    knot,
    onChange,
    onDelete,
}: {
    knot: LabeledKnot;
    onChange: (knot: LabeledKnot) => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation();
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

    const [localKnot, setLocalKnot] = useState(knot);

    useEffect(() => {
        setLocalKnot(knot);
    }, [knot]);

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "120px 1fr 40px 40px", alignItems: "center", gap: 1 }}>
            <TextField
                label={t("code")}
                type="number"
                inputProps={{ step: 1 }}
                fullWidth
                size="small"
                data-code-input
                value={`${localKnot.position}`}
                onChange={(e) => setLocalKnot({ ...localKnot, position: (e.target as HTMLInputElement).valueAsNumber })}
                onBlur={(e) => onChange({ ...knot, position: (e.target as HTMLInputElement).valueAsNumber })}
            />
            <TextField
                label={t("label")}
                fullWidth
                size="small"
                value={localKnot.label}
                onChange={(e) => setLocalKnot({ ...knot, label: e.target.value })}
                onBlur={(e) => onChange({ ...knot, label: e.target.value })}
            />
            <IconButton
                onClick={(e) => {
                    setColorPickerAnchor(!colorPickerAnchor && e?.currentTarget ? e.currentTarget : null);
                }}
            >
                <ColorIcon iconColor={localKnot.color} fontSize="small" />
            </IconButton>
            <IconButton onClick={onDelete}>
                <Delete />
            </IconButton>

            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => setColorPickerAnchor(null)}
                color={knot.color}
                onChangeComplete={({ rgb }) => onChange({ ...knot, color: rgbToVec(rgb) })}
            />
        </Box>
    );
}

function UndefinedColorPicker({ color, onChange }: { color: VecRGBA; onChange: (value: VecRGBA) => void }) {
    const { t } = useTranslation();
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px 40px", alignItems: "center", gap: 1 }}>
            <Typography>{t("undefinedColor")}</Typography>

            <IconButton
                onClick={(e) => {
                    setColorPickerAnchor(!colorPickerAnchor && e?.currentTarget ? e.currentTarget : null);
                }}
            >
                <ColorIcon iconColor={color} fontSize="small" />
            </IconButton>

            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => setColorPickerAnchor(null)}
                color={color}
                onChangeComplete={({ rgb }) => onChange(rgbToVec(rgb))}
            />
        </Box>
    );
}
