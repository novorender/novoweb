import { Add, Delete } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { ColorPicker } from "features/colorPicker";
import { renderActions, selectTerrain } from "features/render";
import { rgbToVecRGB, VecRGB } from "utils/color";

import ColorIcon from "../components/colorIcon";
import { selectPointVisualizationOriginalState } from "../selectors";

type Knot = ReturnType<typeof selectTerrain>["elevationGradient"]["knots"][0];

export function ElevationView() {
    const { t } = useTranslation();
    const isEditing = useAppSelector(selectPointVisualizationOriginalState) !== undefined;
    const originalGradient = useAppSelector(selectTerrain).elevationGradient;
    const [gradient, setGradient] = useState(originalGradient);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dispatch = useAppDispatch();

    const updateGradient = (newGradient: typeof gradient) => {
        setGradient(newGradient);

        const knots = newGradient.knots
            .filter((k) => Number.isFinite(k.position))
            .toSorted((a, b) => a.position - b.position);
        dispatch(
            renderActions.setTerrain({
                elevationGradient: { knots },
            }),
        );
    };

    useEffect(() => {
        if (!isEditing) {
            setGradient(originalGradient);
        }
    }, [isEditing, originalGradient]);

    const setKnots = (knots: Knot[]) => {
        updateGradient({ ...gradient, knots });
    };

    const updateKnot = (knot: Knot, i: number) => {
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

        setKnots([...gradient.knots, { position, color: [0, 0, 0] }]);

        setTimeout(() => {
            let input: HTMLInputElement | undefined;
            containerRef.current?.querySelectorAll("[data-elevation-input] input").forEach((e) => {
                input = e as HTMLInputElement;
            });
            input?.focus();
        });
    };

    return (
        <ScrollBox p={2} ref={containerRef}>
            <Stack gap={2}>
                {isEditing ? (
                    <>
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
                                <Add sx={{ mr: 1 }} /> {t("addElevation")}
                            </Button>
                        </Box>
                    </>
                ) : (
                    <>
                        {gradient.knots.length === 0 && (
                            <Typography color="grey" textAlign="center">
                                {t("noColorStopsDefined")}
                            </Typography>
                        )}
                        {gradient.knots.map((knot, i) => (
                            <KnotView key={i} label={knot.position.toFixed(2)} color={knot.color} />
                        ))}
                    </>
                )}
            </Stack>
        </ScrollBox>
    );
}

function KnotView({ label, color }: { label: ReactNode; color: VecRGB }) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px", alignItems: "center", gap: 1 }}>
            <Typography>{label}</Typography>
            <ColorIcon iconColor={color} />
        </Box>
    );
}

function KnotInput({ knot, onChange, onDelete }: { knot: Knot; onChange: (knot: Knot) => void; onDelete: () => void }) {
    const { t } = useTranslation();
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

    const [localKnot, setLocalKnot] = useState({
        position: `${knot.position}`,
        color: knot.color,
    });

    useEffect(() => {
        setLocalKnot({
            position: `${knot.position}`,
            color: knot.color,
        });
    }, [knot]);

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px 40px", alignItems: "center", gap: 1 }}>
            <TextField
                label={t("elevation")}
                type="number"
                fullWidth
                size="small"
                data-elevation-input
                value={`${localKnot.position}`}
                onChange={(e) => setLocalKnot({ ...localKnot, position: (e.target as HTMLInputElement).value })}
                onBlur={(e) => {
                    const value = (e.target as HTMLInputElement).valueAsNumber;
                    onChange({ ...knot, position: Number.isFinite(value) ? value : knot.position });
                }}
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
                onChangeComplete={({ rgb }) => onChange({ ...knot, color: rgbToVecRGB(rgb) })}
            />
        </Box>
    );
}
