import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { renderActions, selectViewMode } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";

import { selectSaveStatus } from "../selectors";

export function MixFactorInput() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectSaveStatus);
    const isDeviationsMode = useAppSelector(selectViewMode) === ViewMode.Deviations;

    const handleModeChange = (evt: SelectChangeEvent | ChangeEvent<HTMLInputElement>) => {
        dispatch(renderActions.setViewMode(evt.target.value === "on" ? ViewMode.Deviations : ViewMode.Default));
    };

    const loading = saveStatus.status === AsyncStatus.Loading;

    return (
        <Select
            name="deviations mode"
            variant="standard"
            label="mode"
            size="small"
            value={isDeviationsMode ? "on" : "off"}
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
