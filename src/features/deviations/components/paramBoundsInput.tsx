import { Box, BoxProps, OutlinedInput, Slider } from "@mui/material";
import { useEffect, useState } from "react";

import { PARAM_BOUND_PRECISION } from "../utils";

export function ParamBoundsInput({
    value,
    onValueChange,
    min,
    max,
    disabled,
    ...boxProps
}: BoxProps & {
    value: [number, number];
    onValueChange?: (value: [number, number]) => void;
    min: number;
    max: number;
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState(roundValue(value));
    const [draftStr, setDraftStr] = useState(valueToStr(value));

    useEffect(() => {
        setDraft(roundValue(value));
        setDraftStr(valueToStr(value));
    }, [value]);

    const setSingleBound = (index: number, s: string) => {
        const parsed = Number(s);
        if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
            const newDraft = draft.slice() as [number, number];
            newDraft[index] = parsed;
            setDraft(newDraft);
        }
        const newDraftStr = draftStr.slice() as [string, string];
        newDraftStr[index] = s;
        setDraftStr(newDraftStr);
    };

    const handleInputBlur = (index: number) => {
        let parsed = Number(draftStr[index]);
        if (!Number.isFinite(parsed)) {
            setDraftStr(valueToStr(draft));
            return;
        }

        parsed = Math.max(min, Math.min(max, parsed));
        const newValue = draft.slice() as [number, number];
        newValue[index] = parsed;
        newValue.sort((a, b) => a - b);
        onValueChange?.(newValue);
    };

    return (
        <Box display="flex" alignItems="center" gap={4} {...boxProps}>
            <Box flex="0 0 120px">
                <OutlinedInput
                    value={draftStr[0]}
                    size="small"
                    onChange={(e) => setSingleBound(0, e.target.value)}
                    onBlur={() => handleInputBlur(0)}
                    disabled={disabled}
                    inputProps={{ type: "number" }}
                    fullWidth
                />
            </Box>
            <Slider
                getAriaLabel={() => "Profile number range"}
                value={draft}
                min={Number(fmtValue(min))}
                max={Number(fmtValue(max))}
                onChange={(_, value) => {
                    setDraft(value as [number, number]);
                    setDraftStr(valueToStr(value as [number, number]));
                }}
                onChangeCommitted={(_, value) => {
                    onValueChange?.(value as [number, number]);
                }}
                valueLabelDisplay="auto"
                sx={{ flex: "auto" }}
                disabled={disabled}
            />
            <Box flex="0 0 120px">
                <OutlinedInput
                    value={draftStr[1]}
                    size="small"
                    onChange={(e) => setSingleBound(1, e.target.value)}
                    onBlur={() => handleInputBlur(1)}
                    disabled={disabled}
                    inputProps={{ type: "number" }}
                    fullWidth
                />
            </Box>
        </Box>
    );
}

function roundValue(value: [number, number]): [number, number] {
    return [Number(fmtValue(value[0])), Number(fmtValue(value[1]))];
}

function valueToStr(value: [number, number]): [string, string] {
    return [fmtValue(value[0]), fmtValue(value[1])];
}

function fmtValue(v: number) {
    return v.toFixed(PARAM_BOUND_PRECISION);
}
