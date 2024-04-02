import { Box, FormControl, FormHelperText, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { useMemo } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useObjectGroups } from "contexts/objectGroups";
import { selectLandXmlPaths } from "features/followPath";
import { useLoadLandXmlPath } from "features/followPath/hooks/useLoadLandXmlPath";
import { AsyncStatus } from "types/misc";

import { deviationsActions, selectSelectedProfile, selectSelectedSubprofileIndex } from "../deviationsSlice";
import { DELETED_DEVIATION_LABEL } from "../utils";

export function SubprofileSelect() {
    const dispatch = useAppDispatch();
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const selectedSubprofileIndex = useAppSelector(selectSelectedSubprofileIndex);
    const objectGroups = useObjectGroups();

    useLoadLandXmlPath();

    const options = useMemo(
        () =>
            selectedProfile &&
            selectedProfile.subprofiles.map((sp, index) => {
                const from = sp.from.groupIds
                    .map((id) => objectGroups.find((g) => g.id === id)?.name ?? DELETED_DEVIATION_LABEL)
                    .join(", ");
                const to = sp.to.groupIds
                    .map((id) => objectGroups.find((g) => g.id === id)?.name ?? DELETED_DEVIATION_LABEL)
                    .join(", ");

                const centerLineName =
                    sp.centerLine && landXmlPaths.status === AsyncStatus.Success
                        ? landXmlPaths.data.find((e) => e.id === sp.centerLine!.objectId)?.name
                        : undefined;

                return {
                    index,
                    content: (
                        <Box sx={{ textWrap: "wrap" }}>
                            {from}
                            <Typography component="span" fontWeight={600} mx={1}>
                                vs
                            </Typography>
                            {to}
                            {sp.centerLine && centerLineName && (
                                <FormHelperText>
                                    Center line: {centerLineName} {sp.centerLine.parameterBounds[0].toFixed(0)}-
                                    {sp.centerLine.parameterBounds[1].toFixed(0)}
                                </FormHelperText>
                            )}
                        </Box>
                    ),
                };
            }),
        [objectGroups, selectedProfile, landXmlPaths]
    );

    if (!options || options.length < 2 || landXmlPaths.status !== AsyncStatus.Success) {
        return null;
    }

    return (
        <FormControl fullWidth>
            <InputLabel id="select-center-line-label">Select subprofile</InputLabel>
            <Select
                labelId="select-center-line-label"
                id="select-center-line"
                value={selectedSubprofileIndex ?? ""}
                label="Select subprofile"
                onChange={(e) => {
                    dispatch(deviationsActions.setSelectedSubprofileIndex(Number(e.target.value)));
                }}
            >
                {options.map((option) => (
                    <MenuItem key={option.index} value={option.index}>
                        {option.content}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
