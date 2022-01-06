import { MouseEvent, useState } from "react";
import { Clear, MoreVert, Visibility } from "@mui/icons-material";
import { Box, IconButton, List, ListItemIcon, ListItemText, Menu, MenuItem, MenuList } from "@mui/material";

import { useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";

import { Group } from "./group";
import { OrganisedGroups, StyledCheckbox } from "./groupsWidget";
import { GroupsStatus, selectGroupsStatus } from "./groupsSlice";

export const GroupCollection = ({
    grouping,
    colorPickerPosition,
    editGroup,
}: {
    grouping: OrganisedGroups["grouped"][keyof OrganisedGroups["grouped"]];
    colorPickerPosition: { top: number; left: number } | undefined;
    editGroup: (id: string) => void;
}) => {
    const { dispatch: dispatchCustomGroups } = useCustomGroups();
    const status = useAppSelector(selectGroupsStatus);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const allGroupedSelected = !grouping.groups.some((group) => !group.selected);
    const allGroupedHidden = !grouping.groups.some((group) => !group.hidden);
    const disableChanges = status === GroupsStatus.Saving;

    return (
        <Accordion>
            <AccordionSummary>
                <Box width={0} flex="1 1 auto" overflow="hidden">
                    <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                        {grouping.name}
                    </Box>
                </Box>
                <Box flex="0 0 auto">
                    <StyledCheckbox
                        data-test="toggle-highlighting"
                        aria-label="toggle group highlighting"
                        sx={{ marginLeft: "auto" }}
                        size="small"
                        disabled={disableChanges}
                        onChange={() =>
                            grouping.groups.forEach((group) =>
                                dispatchCustomGroups(
                                    customGroupsActions.update(group.id, {
                                        selected: !allGroupedSelected,
                                        hidden: !allGroupedSelected ? false : group.hidden,
                                    })
                                )
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
                        disabled={disableChanges}
                        onChange={() =>
                            grouping.groups.forEach((group) =>
                                dispatchCustomGroups(
                                    customGroupsActions.update(group.id, {
                                        hidden: !allGroupedHidden,
                                        selected: !allGroupedHidden ? false : group.selected,
                                    })
                                )
                            )
                        }
                        checked={allGroupedHidden}
                        onClick={(event) => event.stopPropagation()}
                        onFocus={(event) => event.stopPropagation()}
                    />
                </Box>
                <Box flex="0 0 auto">
                    <IconButton
                        size="small"
                        sx={{ py: 0 }}
                        aria-haspopup="true"
                        disabled={disableChanges}
                        onClick={openMenu}
                        onFocus={(event) => event.stopPropagation()}
                    >
                        <MoreVert />
                    </IconButton>
                </Box>
                <Menu
                    onClick={(e) => e.stopPropagation()}
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={closeMenu}
                    id={`${grouping.name}-menu`}
                >
                    <MenuList sx={{ maxWidth: "100%" }}>
                        <MenuItem
                            onClick={() => {
                                grouping.groups.forEach((group) =>
                                    dispatchCustomGroups(customGroupsActions.update(group.id, { grouping: undefined }))
                                );
                            }}
                        >
                            <ListItemIcon>
                                <Clear fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Ungroup</ListItemText>
                        </MenuItem>
                    </MenuList>
                </Menu>
            </AccordionSummary>
            <AccordionDetails>
                <Box pr={3}>
                    <List sx={{ padding: 0 }}>
                        {grouping.groups.map((group, index) => (
                            <Group
                                key={group.name + index}
                                editGroup={() => editGroup(group.id)}
                                group={group}
                                colorPickerPosition={colorPickerPosition}
                            />
                        ))}
                    </List>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};
