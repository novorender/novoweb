import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectLandXmlPaths } from "features/followPath";
import { useLoadLandXmlPath } from "features/followPath/hooks/useLoadLandXmlPath";
import { AsyncStatus } from "types/misc";

import { deviationsActions, selectSelectedCenterLineId, selectSelectedProfile } from "../deviationsSlice";

export function CenterLineSelect() {
    const dispatch = useAppDispatch();
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const selectedCenterLineId = useAppSelector(selectSelectedCenterLineId);

    useLoadLandXmlPath();

    if (!selectedProfile || landXmlPaths.status !== AsyncStatus.Success) {
        return null;
    }

    const profileCenterLines = selectedProfile.subprofiles
        .filter((sp) => sp.centerLine)
        .map((sp) => sp.centerLine!.brepId);
    const hasMultipleCenterLines = new Set(profileCenterLines).size > 1;
    if (!hasMultipleCenterLines) {
        return null;
    }

    let options = selectedProfile.subprofiles
        .filter((sp) => sp.centerLine)
        .map((sp) => {
            const followPath = landXmlPaths.data.find((e) => e.id === sp.centerLine!.objectId)!;
            return { id: sp.centerLine!.brepId, name: followPath.name };
        });
    options = options.filter((item, i) => options.findIndex((item2) => item2.id === item.id) === i);

    return (
        <FormControl fullWidth>
            <InputLabel id="select-center-line-label">Select center line</InputLabel>
            <Select
                labelId="select-center-line-label"
                id="select-center-line"
                value={selectedCenterLineId ?? ""}
                label="Select center line"
                onChange={(e) => {
                    dispatch(deviationsActions.setSelectedCenterLineId(e.target.value));
                }}
            >
                {options.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                        {option.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
