import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { renderActions, selectDeviations } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";

import { selectSaveStatus } from "../selectors";

export function MixFactorInput() {
    const { t } = useTranslation();
    const deviations = useAppSelector(selectDeviations);
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectSaveStatus);

    const handleModeChange = (evt: SelectChangeEvent | ChangeEvent<HTMLInputElement>) => {
        const mixFactor = evt.target.value === "on" ? 1 : 0;

        dispatch(
            renderActions.setPoints({
                deviation: {
                    mixFactor,
                },
            }),
        );

        dispatch(renderActions.setViewMode(mixFactor === 1 ? ViewMode.Deviations : ViewMode.Default));
    };

    const loading = saveStatus.status === AsyncStatus.Loading;

    return (
        <Select
            name="deviations mode"
            variant="standard"
            label="mode"
            size="small"
            value={deviations.mixFactor === 1 ? "on" : "off"}
            sx={{ minWidth: 50, lineHeight: "normal", ml: 2 }}
            inputProps={{ sx: { p: 0, fontSize: 14 } }}
            onChange={handleModeChange}
            disabled={loading}
        >
            <MenuItem value="on">{t("on")}</MenuItem>
            <MenuItem value="off">{t("off")}</MenuItem>
        </Select>
    );
}
