import { useState, useCallback, RefCallback } from "react";
import { makeStyles, createStyles, List, ListItem, Box, Typography, Checkbox, IconButton } from "@material-ui/core";
import { Visibility, ColorLens } from "@material-ui/icons";
import type { ObjectGroup } from "@novorender/data-js-api";

import { ScrollBox, Accordion, AccordionSummary, AccordionDetails, Tooltip } from "components";
import { useToggle } from "hooks/useToggle";
import { renderActions, selectObjectGroups } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { vecToRgb, rgbToVec, VecRGB } from "utils/color";
import { ColorPicker } from "features/colorPicker";

const useStyles = makeStyles((theme) =>
    createStyles({
        container: {
            overflow: "hidden overlay",
            fallbacks: {
                overflow: "hidden auto",
            },
        },
        accordionSummaryCheckbox: {
            marginLeft: "auto",
        },
        groupFunctionIcon: {
            paddingTop: 0,
            paddingBottom: 0,
        },
        listItem: {
            padding: `${theme.spacing(0.5)}px ${theme.spacing(1)}px`,
            margin: 0,
        },
        listItemInset: {
            paddingRight: theme.spacing(4),
        },
    })
);

export function Groups() {
    const classes = useStyles();
    const objectGroups = useAppSelector(selectObjectGroups).custom;

    const dispatch = useAppDispatch();

    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useCallback<RefCallback<HTMLDivElement>>((el) => {
        setContainerEl(el);
    }, []);

    const organisedGroups = organiseGroups(objectGroups);
    const allGroupsSelected = !objectGroups.some((group) => !group.selected);
    const allGroupsHidden = !objectGroups.some((group) => !group.hidden);
    const colorPickerPosition = getPickerPosition(containerEl);
    const hasGrouping = objectGroups.some((group) => group.grouping);

    const handleChange = (updatedGroups: ExtendedObjectGroup[]) => {
        const _updatedGroups = objectGroups.map((group, index) => {
            const updatedGroup = updatedGroups.find((updated) => updated.index === index);

            if (updatedGroup) {
                const { index: _index, ...updated } = updatedGroup;

                return updated;
            }

            return group;
        });

        dispatch(renderActions.setObjectGroups({ custom: _updatedGroups }));
    };

    return (
        <div ref={containerRef}>
            <ScrollBox height={1} pb={2} className={classes.container}>
                <List>
                    <ListItem
                        className={`${classes.listItem} ${hasGrouping ? classes.listItemInset : ""}`}
                        button
                        disableRipple
                        onClick={() =>
                            dispatch(
                                renderActions.setObjectGroups({
                                    custom: objectGroups.map((group) => ({ ...group, selected: !allGroupsSelected })),
                                })
                            )
                        }
                    >
                        <Box display="flex" width={1} alignItems="center">
                            <Box flex={"1 1 100%"}>
                                <Typography color="textSecondary" noWrap={true}>
                                    Groups:{" "}
                                    {organisedGroups.singles.length + Object.values(organisedGroups.grouped).length}
                                </Typography>
                            </Box>
                            <Checkbox
                                aria-label="toggle all groups coloring"
                                className={classes.groupFunctionIcon}
                                size="small"
                                checked={allGroupsSelected}
                                onChange={() =>
                                    dispatch(
                                        renderActions.setObjectGroups({
                                            custom: objectGroups.map((group) => ({
                                                ...group,
                                                selected: !allGroupsSelected,
                                            })),
                                        })
                                    )
                                }
                            />
                            <Checkbox
                                aria-label="toggle group visibility"
                                className={classes.groupFunctionIcon}
                                size="small"
                                icon={<Visibility />}
                                checkedIcon={<Visibility color="disabled" />}
                                checked={allGroupsHidden}
                                onChange={() =>
                                    dispatch(
                                        renderActions.setObjectGroups({
                                            custom: objectGroups.map((group) => ({
                                                ...group,
                                                hidden: !allGroupsHidden,
                                            })),
                                        })
                                    )
                                }
                            />
                        </Box>
                    </ListItem>

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
                                    <Typography variant="body2" style={{ fontWeight: "bold" }} noWrap>
                                        {grouping.name}
                                    </Typography>
                                </Box>
                                <Box flex="0 0 auto">
                                    <Checkbox
                                        className={classes.accordionSummaryCheckbox}
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
                                    <Checkbox
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
                                <Box pl={2} pr={3}>
                                    <List>
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
        </div>
    );
}

function Group({
    group,
    inset,
    handleChange,
    colorPickerPosition,
}: {
    group: ExtendedObjectGroup;
    inset?: boolean;
    colorPickerPosition: { top: number; left: number } | undefined;
    handleChange: (updated: ExtendedObjectGroup[]) => void;
}) {
    const classes = useStyles();

    const [colorPicker, toggleColorPicker] = useToggle();
    const [r, g, b] = vecToRgb(group.color);

    return (
        <>
            <ListItem
                className={`${classes.listItem} ${inset ? classes.listItemInset : ""}`}
                button
                disableRipple
                onClick={() => handleChange([toggleSelected(group)])}
            >
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={group.name} interactive>
                            <Typography noWrap={true}>{group.name}</Typography>
                        </Tooltip>
                    </Box>
                    <Box flex="0 0 auto">
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleColorPicker();
                            }}
                            size="small"
                            className={classes.groupFunctionIcon}
                        >
                            <ColorLens style={{ fill: `rgb(${r}, ${g}, ${b})` }} />
                        </IconButton>
                    </Box>
                    <Box flex="0 0 auto">
                        <Checkbox
                            aria-label="toggle group coloring"
                            size="small"
                            checked={group.selected}
                            onChange={() => handleChange([toggleSelected(group)])}
                            className={classes.groupFunctionIcon}
                        />
                    </Box>
                    <Box flex="0 0 auto">
                        <Checkbox
                            aria-label="toggle group visibility"
                            size="small"
                            icon={<Visibility />}
                            checkedIcon={<Visibility color="disabled" />}
                            checked={group.hidden}
                            onChange={() => handleChange([toggleVisibility(group)])}
                            className={classes.groupFunctionIcon}
                        />
                    </Box>
                </Box>
            </ListItem>
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

function changeColor<Group extends ObjectGroup | ExtendedObjectGroup>(group: Group, color: VecRGB): Group {
    return {
        ...group,
        color,
    };
}

function toggleSelected<Group extends ObjectGroup | ExtendedObjectGroup>(group: Group): Group {
    return {
        ...group,
        selected: !group.selected,
    };
}

function toggleVisibility<Group extends ObjectGroup | ExtendedObjectGroup>(group: Group): Group {
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
    return { top: top + 24, left: left + 24 }; // use picker width
}

type ExtendedObjectGroup = ObjectGroup & { index: number };

type OrganisedGroups = {
    singles: ExtendedObjectGroup[];
    grouped: Record<string, { name: string; groups: ExtendedObjectGroup[] }>;
};

function organiseGroups(objectGroups: ObjectGroup[]): OrganisedGroups {
    let singles: ExtendedObjectGroup[] = [];
    let grouped: Record<string, { name: string; groups: ExtendedObjectGroup[] }> = {};

    objectGroups.forEach((group, index) => {
        if (!group.grouping) {
            return (singles = [...singles, { ...group, index }]);
        }

        if (!grouped[group.grouping]) {
            return (grouped = {
                ...grouped,
                [group.grouping]: { name: group.grouping, groups: [{ ...group, index }] },
            });
        }

        return (grouped = {
            ...grouped,
            [group.grouping]: {
                ...grouped[group.grouping],
                groups: [...grouped[group.grouping].groups, { ...group, index }],
            },
        });
    });

    return { singles, grouped };
}
