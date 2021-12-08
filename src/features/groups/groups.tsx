import { useState, useCallback, RefCallback } from "react";
import {
    List,
    Box,
    Typography,
    Checkbox,
    IconButton,
    styled,
    ListItemButtonProps,
    ListItemButton,
} from "@mui/material";
import { Visibility, ColorLens } from "@mui/icons-material";
import { css } from "@mui/styled-engine";

import {
    ScrollBox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    WidgetContainer,
    LogoSpeedDial,
    WidgetHeader,
} from "components";
import { useToggle } from "hooks/useToggle";
import { vecToRgb, rgbToVec, VecRGB } from "utils/color";
import { ColorPicker } from "features/colorPicker";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";

const StyledListItemButton = styled(ListItemButton, { shouldForwardProp: (prop) => prop !== "inset" })<
    ListItemButtonProps & { inset?: boolean }
>(
    ({ inset, theme }) => css`
        margin: 0;
        padding: ${theme.spacing(0.5)} ${theme.spacing(inset ? 4 : 1)} ${theme.spacing(0.5)} ${theme.spacing(1)};
    `
);

const StyledCheckbox = styled(Checkbox)`
    padding-top: 0;
    padding-bottom: 0;
`;

export function Groups() {
    const [menuOpen, toggleMenu] = useToggle();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();

    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useCallback<RefCallback<HTMLDivElement>>((el) => {
        setContainerEl(el);
    }, []);

    const organisedGroups = organiseGroups(customGroups);
    const allGroupsSelected = customGroups.length > 0 && !customGroups.some((group) => !group.selected);
    const allGroupsHidden = customGroups.length > 0 && !customGroups.some((group) => !group.hidden);
    const colorPickerPosition = getPickerPosition(containerEl);
    const hasGrouping = customGroups.some((group) => group.grouping);

    const handleChange = (updatedGroups: CustomGroup[]) => {
        dispatchCustom(
            customGroupsActions.set(
                customGroups.map((group) => updatedGroups.find((updated) => updated.id === group.id) ?? group)
            )
        );
    };

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.groups} />
                <Box flexDirection="column" overflow="hidden" flexGrow={1} height={1}>
                    <ScrollBox display={menuOpen ? "none" : "flex"} ref={containerRef} height={1} pb={2}>
                        <List sx={{ width: 1 }}>
                            <StyledListItemButton
                                inset={hasGrouping}
                                disableRipple
                                onClick={() =>
                                    handleChange(
                                        customGroups.map((group) => ({ ...group, selected: !allGroupsSelected }))
                                    )
                                }
                            >
                                <Box display="flex" width={1} alignItems="center">
                                    <Box flex={"1 1 100%"}>
                                        <Typography color="textSecondary" noWrap={true}>
                                            Groups:{" "}
                                            {organisedGroups.singles.length +
                                                Object.values(organisedGroups.grouped).length}
                                        </Typography>
                                    </Box>
                                    {customGroups.length ? (
                                        <>
                                            <StyledCheckbox
                                                aria-label="toggle all groups highlighting"
                                                size="small"
                                                checked={allGroupsSelected}
                                                onClick={(event) => event.stopPropagation()}
                                                onChange={() =>
                                                    handleChange(
                                                        customGroups.map((group) => ({
                                                            ...group,
                                                            selected: !allGroupsSelected,
                                                        }))
                                                    )
                                                }
                                            />
                                            <StyledCheckbox
                                                data-test="toggle-visibility"
                                                aria-label="toggle group visibility"
                                                size="small"
                                                icon={<Visibility />}
                                                checkedIcon={<Visibility color="disabled" />}
                                                checked={allGroupsHidden}
                                                onClick={(event) => event.stopPropagation()}
                                                onChange={() =>
                                                    handleChange(
                                                        customGroups.map((group) => ({
                                                            ...group,
                                                            hidden: !allGroupsHidden,
                                                        }))
                                                    )
                                                }
                                            />
                                        </>
                                    ) : null}
                                </Box>
                            </StyledListItemButton>

                            {organisedGroups.singles.map((group, index) => (
                                <Group
                                    inset={hasGrouping}
                                    handleChange={handleChange}
                                    group={group}
                                    key={group.name + index}
                                    colorPickerPosition={colorPickerPosition}
                                />
                            ))}
                        </List>
                        {Object.values(organisedGroups.grouped).map((grouping, index) => {
                            const allGroupedSelected = !grouping.groups.some((group) => !group.selected);
                            const allGroupedHidden = !grouping.groups.some((group) => !group.hidden);

                            return (
                                <Accordion key={grouping.name + index}>
                                    <AccordionSummary>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box
                                                fontWeight={600}
                                                overflow="hidden"
                                                whiteSpace="nowrap"
                                                textOverflow="ellipsis"
                                            >
                                                {grouping.name}
                                            </Box>
                                        </Box>
                                        <Box flex="0 0 auto">
                                            <StyledCheckbox
                                                data-test="toggle-highlighting"
                                                aria-label="toggle group highlighting"
                                                sx={{ marginLeft: "auto" }}
                                                size="small"
                                                onChange={() =>
                                                    handleChange(
                                                        grouping.groups.map((group) => ({
                                                            ...group,
                                                            selected: !allGroupedSelected,
                                                        }))
                                                    )
                                                }
                                                checked={allGroupedSelected}
                                                onClick={(event) => event.stopPropagation()}
                                                onFocus={(event) => event.stopPropagation()}
                                            />
                                        </Box>
                                        <Box flex="0 0 auto">
                                            <StyledCheckbox
                                                data-test="toggle-visibility"
                                                aria-label="toggle group visibility"
                                                size="small"
                                                icon={<Visibility />}
                                                checkedIcon={<Visibility color="disabled" />}
                                                onChange={() =>
                                                    handleChange(
                                                        grouping.groups.map((group) => ({
                                                            ...group,
                                                            hidden: !allGroupedHidden,
                                                        }))
                                                    )
                                                }
                                                checked={allGroupedHidden}
                                                onClick={(event) => event.stopPropagation()}
                                                onFocus={(event) => event.stopPropagation()}
                                            />
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box pr={3}>
                                            <List sx={{ padding: 0 }}>
                                                {grouping.groups.map((group, index) => (
                                                    <Group
                                                        key={group.name + index}
                                                        handleChange={handleChange}
                                                        group={group}
                                                        colorPickerPosition={colorPickerPosition}
                                                    />
                                                ))}
                                            </List>
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </ScrollBox>
                    <WidgetList
                        display={menuOpen ? "block" : "none"}
                        widgetKey={featuresConfig.groups.key}
                        onSelect={toggleMenu}
                    />
                </Box>
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.groups.key}-widget-menu-fab`}
                ariaLabel="toggle widget menu"
            />
        </>
    );
}

function Group({
    group,
    inset,
    handleChange,
    colorPickerPosition,
}: {
    group: CustomGroup;
    inset?: boolean;
    colorPickerPosition: { top: number; left: number } | undefined;
    handleChange: (updated: CustomGroup[]) => void;
}) {
    const [colorPicker, toggleColorPicker] = useToggle();
    const [r, g, b] = vecToRgb(group.color);

    return (
        <>
            <StyledListItemButton inset={inset} disableRipple onClick={() => handleChange([toggleSelected(group)])}>
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={group.name}>
                            <Typography noWrap={true}>{group.name}</Typography>
                        </Tooltip>
                    </Box>
                    <Box flex="0 0 auto">
                        <IconButton
                            sx={{ paddingBottom: 0, paddingTop: 0 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleColorPicker();
                            }}
                            size="small"
                        >
                            <ColorLens style={{ fill: `rgb(${r}, ${g}, ${b})` }} />
                        </IconButton>
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            aria-label="toggle group highlighting"
                            size="small"
                            checked={group.selected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => handleChange([toggleSelected(group)])}
                        />
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            data-test="toggle-visibility"
                            aria-label="toggle group visibility"
                            size="small"
                            icon={<Visibility />}
                            checkedIcon={<Visibility color="disabled" />}
                            checked={group.hidden}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => handleChange([toggleVisibility(group)])}
                        />
                    </Box>
                </Box>
            </StyledListItemButton>
            {colorPicker ? (
                <ColorPicker
                    position={colorPickerPosition}
                    color={group.color}
                    onChangeComplete={({ rgb }) => handleChange([changeColor(group, rgbToVec([rgb.r, rgb.g, rgb.b]))])}
                    onOutsideClick={toggleColorPicker}
                />
            ) : null}
        </>
    );
}

function changeColor(group: CustomGroup, color: VecRGB): CustomGroup {
    return {
        ...group,
        color,
    };
}

function toggleSelected(group: CustomGroup): CustomGroup {
    return {
        ...group,
        selected: !group.selected,
    };
}

function toggleVisibility(group: CustomGroup): CustomGroup {
    return {
        ...group,
        hidden: !group.hidden,
    };
}

function getPickerPosition(el: HTMLElement | null) {
    if (!el) {
        return;
    }

    const { top, left } = el.getBoundingClientRect();
    return { top: top + 24, left: left + 24 };
}

type OrganisedGroups = {
    singles: CustomGroup[];
    grouped: Record<string, { name: string; groups: CustomGroup[] }>;
};

function organiseGroups(objectGroups: CustomGroup[]): OrganisedGroups {
    let singles: CustomGroup[] = [];
    let grouped: Record<string, { name: string; groups: CustomGroup[] }> = {};

    objectGroups.forEach((group) => {
        if (!group.grouping) {
            singles = [...singles, group];
            return;
        }

        if (!grouped[group.grouping]) {
            grouped = {
                ...grouped,
                [group.grouping]: { name: group.grouping, groups: [group] },
            };

            return;
        }

        grouped = {
            ...grouped,
            [group.grouping]: {
                ...grouped[group.grouping],
                groups: [...grouped[group.grouping].groups, group],
            },
        };

        return;
    });

    return { singles, grouped };
}
