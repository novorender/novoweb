import { Box, OutlinedInput } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { selectCurrentSubprofileDeviationDistributions, selectSelectedSubprofile } from "../selectors";
import { PARAM_BOUND_PRECISION } from "../utils";
import { CenterlineMinimapWithBrush } from "./centerlineMinimapWithBrush";

const EMPTY_PARAMETER_BOUNDS = [0, 100] as [number, number];

export function RootParamBounds() {
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const distributions = useAppSelector(selectCurrentSubprofileDeviationDistributions);
    const dispatch = useAppDispatch();

    const parameterBounds = useMemo(() => {
        return distributions?.parameterBounds ?? subprofile?.centerLine?.parameterBounds;
    }, [distributions, subprofile]);

    const [draft, setDraft] = useState(roundValue(parameterBounds ?? EMPTY_PARAMETER_BOUNDS));
    const [draftStr, setDraftStr] = useState(valueToStr(parameterBounds ?? EMPTY_PARAMETER_BOUNDS));

    useEffect(() => {
        const bounds = parameterBounds ?? EMPTY_PARAMETER_BOUNDS;
        setDraft(roundValue(bounds));
        setDraftStr(valueToStr(bounds));
    }, [parameterBounds]);

    const setSingleBound = (index: number, s: string) => {
        const fullBounds = subprofile?.centerLine?.parameterBounds;
        if (!fullBounds) {
            return;
        }

        const [min, max] = fullBounds;
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

        const fullBounds = subprofile?.centerLine?.parameterBounds;
        if (!fullBounds) {
            return;
        }

        const [min, max] = fullBounds;
        parsed = Math.max(min, Math.min(max, parsed));
        const newValue = draft.slice() as [number, number];
        newValue[index] = parsed;
        newValue.sort((a, b) => a - b);
        dispatch(
            deviationsActions.setSubprofileDeviationDistributions({
                parameterBounds: newValue,
                data: { status: AsyncStatus.Initial },
            })
        );
    };

    if (!subprofile?.centerLine || !parameterBounds) {
        return;
    }

    const disabled = false;

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <Box flex="0 0 120px">
                <OutlinedInput
                    value={draftStr[0]}
                    size="small"
                    onChange={(e) => setSingleBound(0, e.target.value)}
                    onBlur={() => handleInputBlur(0)}
                    disabled={disabled}
                    inputProps={{ type: "number", step: 1 }}
                    fullWidth
                />
            </Box>
            <CenterlineMinimapWithBrush />
            <Box flex="0 0 120px">
                <OutlinedInput
                    value={draftStr[1]}
                    size="small"
                    onChange={(e) => setSingleBound(1, e.target.value)}
                    onBlur={() => handleInputBlur(1)}
                    disabled={disabled}
                    inputProps={{ type: "number", step: 1 }}
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
