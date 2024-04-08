import { Close, OpenInNew, Palette, Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, Checkbox, IconButton, SvgIconProps } from "@mui/material";
import { memo, useMemo } from "react";

import { ColorStop } from "apis/dataV2/deviationTypes";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { GroupStatus, isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { selectView2d } from "features/followPath";
import { vecToRgb } from "utils/color";

import { deviationsActions, selectDeviationLegendGroups, selectSelectedProfile } from "../deviationsSlice";
import { formatColorStopPos, sortColorStops } from "../utils";

export const GroupsAndColorsHud = memo(function GroupsAndColorsHud({ widgetMode = false }: { widgetMode?: boolean }) {
    const profile = useAppSelector(selectSelectedProfile);
    const legendGroups = useAppSelector(selectDeviationLegendGroups);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const dispatch = useAppDispatch();
    const isCrossSection = useAppSelector(selectView2d);

    const groups = useMemo(
        () =>
            (legendGroups ?? [])
                .map((g1) => {
                    const group = objectGroups.find((g2) => g2.id === g1.id);
                    return group
                        ? ({
                              ...group,
                              status: g1.status,
                              color: g1.usesGroupColor ? (isCrossSection ? "grey" : group.color) : undefined,
                          } as ObjectGroup)
                        : undefined;
                })
                .filter((g) => g) as ObjectGroup[],
        [legendGroups, objectGroups, isCrossSection]
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
                return { ...g, status: g.status === GroupStatus.Hidden ? GroupStatus.Selected : GroupStatus.Hidden };
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
            <Box
                mx={1}
                mb={1}
                fontWeight="600"
                fontSize="1.5rem"
                title={profile.name}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
            >
                {widgetMode ? "Group visibility" : profile.name}
                {widgetMode ? (
                    <IconButton color="default" onClick={() => dispatch(deviationsActions.setIsLegendFloating(true))}>
                        <OpenInNew />
                    </IconButton>
                ) : (
                    <IconButton color="default" onClick={() => dispatch(deviationsActions.setIsLegendFloating(false))}>
                        <Close />
                    </IconButton>
                )}
            </Box>
            <Box>
                {groups.map((group) => (
                    <GroupNode key={group.id} group={group} onClick={handleClick} colorStops={colorStops} />
                ))}
            </Box>

            {!widgetMode && (
                <Box mt={2}>
                    {colorStops.map((colorStop) => (
                        <ColorStopNode
                            key={colorStop.position}
                            colorStop={colorStop}
                            absoluteValues={profile.colors.absoluteValues}
                        />
                    ))}
                </Box>
            )}
        </>
    );
});

function GroupNode({
    group,
    onClick,
    colorStops,
}: {
    group: ObjectGroup;
    onClick: (group: ObjectGroup) => void;
    colorStops: ColorStop[];
}) {
    const color = group.color ? vecToRgb(group.color) : undefined;
    const hidden = group.status === GroupStatus.Hidden;

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <Checkbox
                name="toggle group visibility"
                aria-label="toggle group visibility"
                size="small"
                icon={
                    color ? (
                        <Visibility
                            htmlColor={`rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(color.a ?? 0, 0.2)})`}
                        />
                    ) : (
                        <RainbowVisibility colorStops={colorStops} />
                    )
                }
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

function RainbowVisibility({ colorStops, ...props }: SvgIconProps & { colorStops: ColorStop[] }) {
    const stops = colorStops
        .map((cs, i) => {
            const color = vecToRgb(cs.color);
            const pos = i === 0 ? 0 : i === colorStops.length - 1 ? 100 : Math.round((i / colorStops.length) * 100);
            const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(color.a ?? 0, 0.2)})`;
            return `<stop stop-color="${rgba}" offset="${pos}%"></stop>`;
        })
        .join("");

    return (
        <Visibility
            ref={(svg) => {
                if (!svg) {
                    return;
                }
                const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                defs.innerHTML = `
                <linearGradient id="gradient">
                    ${stops}
                </linearGradient>`;
                svg.appendChild(defs);
                const path = svg.querySelector("path") as SVGElement;
                path.setAttribute("fill", "url(#gradient)");
            }}
            {...props}
        />
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
