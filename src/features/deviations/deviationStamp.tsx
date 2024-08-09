import { Box, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { MAX_FLOAT, selectStamp, StampKind } from "features/render";

export function DeviationStamp() {
    const { t } = useTranslation();
    const stamp = useAppSelector(selectStamp);

    if (stamp?.kind !== StampKind.Deviation) {
        return null;
    }

    return (
        <Box sx={{ pointerEvents: "auto" }}>
            <MenuItem>
                {t("deviation:")}{" "}
                {stamp.data.deviation === MAX_FLOAT ? "Outside range -1 to 1" : stamp.data.deviation.toFixed(3)}
            </MenuItem>
        </Box>
    );
}
