import { Palette, Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, Checkbox } from "@mui/material";
import { memo, useMemo } from "react";

import { ColorStop } from "apis/dataV2/deviationTypes";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { GroupStatus, isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { vecToRgb } from "utils/color";

import { deviationsActions, selectDeviationLegendGroups, selectSelectedProfile } from "../deviationsSlice";
import { formatColorStopPos, sortColorStops } from "../utils";

export const GroupsAndColorsHud = memo(function GroupsAndColorsHud() {
    const profile = useAppSelector(selectSelectedProfile);
    const legendGroups = useAppSelector(selectDeviationLegendGroups);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const dispatch = useAppDispatch();

    const groups = useMemo(
        () =>
            (legendGroups ?? [])
                .map((g1) => {
                    const group = objectGroups.find((g2) => g2.id === g1.id);
                    return group ? ({ ...group, status: g1.status } as ObjectGroup) : undefined;
                })
                .filter((g) => g) as ObjectGroup[],
        [legendGroups, objectGroups]
    );

    const colorStops = useMemo(
        () => (profile ? sortColorStops(profile.colors.colorStops.slice(), profile.colors.absoluteValues) : []),
        [profile]
    );

    const handleClick = (group: ObjectGroup) => {
        if (!legendGroups) {
            return;
        }

        const newGroups = legendGroups.map((g) => {
            if (g.id === group.id) {
                return { id: g.id, status: g.status === GroupStatus.Hidden ? GroupStatus.None : GroupStatus.Hidden };
            }
            return g;
        });
        dispatch(deviationsActions.setSelectedSubprofileLegendGroups(newGroups));
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
                {colorStops.map((colorStop) => (
                    <ColorStopNode
                        key={colorStop.position}
                        colorStop={colorStop}
                        absoluteValues={profile.colors.absoluteValues}
                    />
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
            <Box textOverflow="ellipsis" overflow="hidden" title={group.name}>
                {group.name}
            </Box>
        </Box>
    );
}

function ColorStopNode({ colorStop, absoluteValues }: { colorStop: ColorStop; absoluteValues: boolean }) {
    const position = formatColorStopPos(colorStop.position, absoluteValues);
    const color = vecToRgb(colorStop.color);

    return (
        <Box display="flex" alignItems="center" gap={1} pl={1}>
            <Box minWidth="50px">{position}</Box>
            <Palette
                fontSize="small"
                sx={{
                    color: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`,
                }}
            />
        </Box>
    );
}
