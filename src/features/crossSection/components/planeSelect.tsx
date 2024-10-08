import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectClippingPlanes } from "features/render";

import { selectPlaneIndex } from "../selectors";
import { crossSectionActions } from "../slice";

export function PlaneSelect() {
    const { t } = useTranslation();
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const planeIndex = useAppSelector(selectPlaneIndex);
    const dispatch = useAppDispatch();

    return (
        <FormControl variant="filled" fullWidth size="small">
            <InputLabel id="plane-select">{t("clippingPlane")}</InputLabel>
            <Select
                labelId="plane-select"
                value={planeIndex !== null && planeIndex < clippingPlanes.planes.length ? planeIndex : ""}
                onChange={(e) => {
                    const index = e.target.value === "" ? null : Number(e.target.value);
                    dispatch(crossSectionActions.setPlaneIndex(index));
                }}
                label={t("clippingPlane")}
                sx={{ borderRadius: 0 }}
            >
                {clippingPlanes.planes.map((_plane, index) => (
                    <MenuItem key={index} value={index}>
                        {t("plane")} {index + 1}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
