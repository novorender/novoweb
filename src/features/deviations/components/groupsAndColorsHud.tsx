import { Close, OpenInNew, Palette, Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, Checkbox, IconButton, SvgIconProps } from "@mui/material";
import { memo, useMemo } from "react";

import { ColorStop } from "apis/dataV2/deviationTypes";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { GroupStatus, isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { selectView2d } from "features/followPath";
import { renderActions } from "features/render";
import { ViewMode } from "types/misc";
import { vecToRgb } from "utils/color";

import { deviationsActions } from "../deviationsSlice";
import { selectDeviationLegendGroups, selectSelectedProfile } from "../selectors";
import { formatColorStopPos, sortColorStopsForUi } from "../utils";

export const GroupsAndColorsHud = memo(function GroupsAndColorsHud({
    widgetMode = false,
    canDetach = true,
    absPos,
}: {
    widgetMode?: boolean;
    canDetach?: boolean;
    absPos: boolean;
}) {
    const profile = useAppSelector(selectSelectedProfile);
    const legendGroups = useAppSelector(selectDeviationLegendGroups);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const dispatch = useAppDispatch();
    const isCrossSection = useAppSelector(selectView2d);

    const deviationColoredGroups = useMemo(
        () =>
            (legendGroups ?? [])
                .filter((g) => g.isDeviationColored)
                .map((g1) => {
                    const group = objectGroups.find((g2) => g2.id === g1.id);
                    return group
                        ? ({
                              ...group,
                              status: g1.status,
                          } as ObjectGroup)
                        : undefined;
                })
                .filter((g) => g) as ObjectGroup[],
        [legendGroups, objectGroups],
    );

    const otherGroups = useMemo(
        () =>
            (legendGroups ?? [])
                .filter((g) => !g.isDeviationColored)
                .map((g1) => {
                    const group = objectGroups.find((g2) => g2.id === g1.id);
                    if (group) {
                        return isCrossSection ? { ...group, color: "grey" } : group;
                    }
                })
                .filter((g) => g) as ObjectGroup[],
        [objectGroups, isCrossSection, legendGroups],
    );

    const colorStops = useMemo(
        () => (profile ? sortColorStopsForUi(profile.colors.colorStops.slice(), profile.colors.absoluteValues) : []),
        [profile],
    );

    const handleGroupClick = (group: ObjectGroup) => {
        if (!legendGroups) {
            return;
        }

        dispatch(renderActions.setViewMode(ViewMode.Deviations));
        dispatch(
            deviationsActions.toggleHiddenLegendGroup({
                groupId: group.id,
                hidden: group.status !== GroupStatus.Hidden,
            }),
        );
    };

    if (!profile) {
        return;
    }

    const groupNodeHeight = 38;
    const colorStopNodeHeight = 24;
    const gap = 16;
    const groupsBottom = colorStops.length * colorStopNodeHeight + gap;
    const headerBottom = groupsBottom + (deviationColoredGroups.length + otherGroups.length) * groupNodeHeight;
    const groupNodeBottom = (index: number) =>
        (deviationColoredGroups.length + otherGroups.length - index - 1) * groupNodeHeight;

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
                justifyContent={widgetMode ? "space-between" : undefined}
                gap={1}
                sx={
                    absPos
                        ? {
                              position: "absolute",
                              bottom: headerBottom,
                          }
                        : {}
                }
            >
                {widgetMode ? (legendGroups.length === 0 && !canDetach ? "" : "Legend") : profile.name}
                {widgetMode && canDetach ? (
                    <IconButton color="default" onClick={() => dispatch(deviationsActions.setIsLegendFloating(true))}>
                        <OpenInNew />
                    </IconButton>
                ) : !widgetMode ? (
                    <IconButton color="default" onClick={() => dispatch(deviationsActions.setIsLegendFloating(false))}>
                        <Close />
                    </IconButton>
                ) : undefined}
            </Box>
            <Box sx={absPos ? { position: "absolute", bottom: groupsBottom } : {}}>
                {deviationColoredGroups.map((group, i) => (
                    <Box
                        key={group.id}
                        sx={absPos ? { position: "absolute", maxWidth: "300px", bottom: groupNodeBottom(i) } : {}}
                    >
                        <GroupNode group={group} onClick={handleGroupClick} colorStops={colorStops} rainbow />
                    </Box>
                ))}
                {(otherGroups || []).map((group, i) => (
                    <Box
                        key={group.id}
                        sx={
                            absPos
                                ? {
                                      position: "absolute",
                                      maxWidth: "300px",
                                      bottom: groupNodeBottom(deviationColoredGroups.length + i),
                                  }
                                : {}
                        }
                    >
                        <GroupNode group={group} onClick={handleGroupClick} colorStops={colorStops} />
                    </Box>
                ))}
            </Box>

            {!widgetMode && (
                <Box sx={absPos ? { position: "absolute", bottom: "0px" } : {}}>
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
    rainbow,
}: {
    group: ObjectGroup;
    onClick: (group: ObjectGroup) => void;
    colorStops: ColorStop[];
    rainbow?: boolean;
}) {
    const color = vecToRgb(group.color);
    const hidden = group.status === GroupStatus.Hidden;

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <Checkbox
                name="toggle group visibility"
                aria-label="toggle group visibility"
                size="small"
                icon={
                    rainbow ? (
                        <RainbowVisibility colorStops={colorStops} />
                    ) : (
                        <Visibility
                            htmlColor={`rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(color.a ?? 0, 0.2)})`}
                        />
                    )
                }
                checkedIcon={!group.opacity ? <VisibilityOff color="disabled" /> : <Visibility color="disabled" />}
                checked={hidden}
                onClick={(event) => event.stopPropagation()}
                onChange={() => onClick(group)}
            />
            <Box textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap" title={group.name}>
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
