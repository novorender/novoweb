import { Palette, Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, Checkbox, Typography } from "@mui/material";
import { ColorStop } from "apis/dataV2/deviationTypes";
import { memo, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { GroupStatus, isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { vecToRgb } from "utils/color";

import { deviationsActions, selectDeviationGroups, selectSelectedProfile } from "../deviationsSlice";

export const GroupsAndColorsHud = memo(function GroupsAndColorsHud() {
    const profile = useAppSelector(selectSelectedProfile);
    const deviationGroups = useAppSelector(selectDeviationGroups);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const dispatch = useAppDispatch();

    const groups = useMemo(
        () =>
            (deviationGroups ?? [])
                .map((g1) => {
                    const group = objectGroups.find((g2) => g2.id === g1.id);
                    return group ? ({ ...group, status: g1.status } as ObjectGroup) : undefined;
                })
                .filter((g) => g) as ObjectGroup[],
        [deviationGroups, objectGroups]
    );

    const handleClick = (group: ObjectGroup) => {
        if (!deviationGroups) {
            return;
        }

        const newGroups = deviationGroups.map((g) => {
            if (g.id === group.id) {
                return { id: g.id, status: g.status === GroupStatus.Hidden ? GroupStatus.None : GroupStatus.Hidden };
            }
            return g;
        });
        dispatch(deviationsActions.setDeviationGroups(newGroups));
    };

    if (!profile) {
        return;
    }

    return (
        <>
            <Box>
                {groups.map((group) => (
                    <GroupNode key={group.id} group={group} onClick={handleClick} />
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

function GroupNode({ group, onClick }: { group: ObjectGroup; onClick: (group: ObjectGroup) => void }) {
    const { r, g, b, a } = vecToRgb(group.color);
    const hidden = group.status === GroupStatus.Hidden;

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
                onChange={() => onClick(group)}
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
