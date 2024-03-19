import { Palette, Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, Checkbox, Typography } from "@mui/material";
import { ColorStop } from "apis/dataV2/deviationTypes";
import { memo } from "react";

import { useAppSelector } from "app/store";
import {
    GroupStatus,
    isInternalGroup,
    ObjectGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useObjectGroups,
} from "contexts/objectGroups";
import { vecToRgb } from "utils/color";

import { selectSelectedProfile } from "../deviationsSlice";

export const GroupsAndColorsHud = memo(function GroupsAndColorsHud() {
    const profile = useAppSelector(selectSelectedProfile);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));

    if (!profile) {
        return;
    }

    const groups = (profile.favorites ?? []).map((id) => objectGroups.find((g) => g.id === id)!).filter((g) => g);

    return (
        <>
            <Box>
                {groups.map((group) => (
                    <GroupNode key={group.id} group={group} />
                ))}
            </Box>
            <Box mt={2}>
                {profile.colors.colorStops.map((colorStop) => (
                    <ColorStopNode key={colorStop.position} colorStop={colorStop} />
                ))}
            </Box>
        </>
    );
});

function GroupNode({ group }: { group: ObjectGroup }) {
    const { r, g, b, a } = vecToRgb(group.color);
    const hidden = group.status === GroupStatus.Hidden;
    const dispatchObjectGroups = useDispatchObjectGroups();

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <Checkbox
                name="toggle group visibility"
                aria-label="toggle group visibility"
                size="small"
                icon={<Visibility htmlColor={`rgba(${r}, ${g}, ${b}, ${Math.max(a ?? 0, 0.2)})`} />}
                checkedIcon={!group.opacity ? <VisibilityOff color="disabled" /> : <Visibility color="disabled" />}
                checked={hidden}
                onClick={(event) => event.stopPropagation()}
                onChange={() =>
                    dispatchObjectGroups(
                        objectGroupsActions.update(group.id, {
                            status: hidden ? GroupStatus.None : GroupStatus.Hidden,
                        })
                    )
                }
            />
            <Typography>{group.name}</Typography>
        </Box>
    );
}

function ColorStopNode({ colorStop }: { colorStop: ColorStop }) {
    const position = `${colorStop.position > 0 ? "+" : ""}${colorStop.position}`;
    const color = vecToRgb(colorStop.color);

    return (
        <Box display="flex" alignItems="center" gap={1} pl={1}>
            <Typography minWidth="50px">{position}</Typography>
            <Palette
                fontSize="small"
                sx={{
                    color: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`,
                }}
            />
        </Box>
    );
}
