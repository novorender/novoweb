import { Box, MenuItem } from "@mui/material";

import { useAppSelector } from "app/redux-store-interactions";
import { MAX_FLOAT, selectStamp, StampKind } from "features/render";

export function DeviationStamp() {
    const stamp = useAppSelector(selectStamp);

    if (stamp?.kind !== StampKind.Deviation) {
        return null;
    }

    return (
        <Box sx={{ pointerEvents: "auto" }}>
            <MenuItem>
                Deviation:{" "}
                {stamp.data.deviation === MAX_FLOAT ? "Outside range -1 to 1" : stamp.data.deviation.toFixed(3)}
            </MenuItem>
        </Box>
    );
}
