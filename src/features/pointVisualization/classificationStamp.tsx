import { Box, MenuItem } from "@mui/material";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import {
    selectClassificationColorGradient,
    selectDefaultPointVisualization,
    selectStamp,
    StampKind,
} from "features/render";

export function ClassificationStamp() {
    const { t } = useTranslation();
    const stamp = useAppSelector(selectStamp);
    const defaultPointVisualization = useAppSelector(selectDefaultPointVisualization);
    const classificationGradient = useAppSelector(selectClassificationColorGradient);

    if (stamp?.kind !== StampKind.Classification) {
        return null;
    }

    let label: ReactNode;
    switch (defaultPointVisualization.kind) {
        case "classification": {
            const knot = classificationGradient.knots.find((e) => e.position === stamp.data.pointFactor);
            const name = knot ? knot.label || t("[noName]") : t("[unknown]");
            label = `${stamp.data.pointFactor.toFixed(0)} - ${name}`;
            break;
        }
        case "intensity": {
            label = `${t("intensity")}: ${stamp.data.pointFactor.toFixed(3)}`;
            break;
        }
    }

    if (!label) {
        return null;
    }

    return (
        <Box sx={{ pointerEvents: "auto" }}>
            <MenuItem>{label}</MenuItem>
        </Box>
    );
}
