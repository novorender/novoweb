import { MouseEvent, useState } from "react";
import { Delete, Edit, MoreVert, Visibility, ColorLens } from "@mui/icons-material";
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Typography } from "@mui/material";

import { Tooltip } from "components";
import { ColorPicker } from "features/colorPicker";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";

import { useToggle } from "hooks/useToggle";
import { rgbToVec, vecToRgb } from "utils/color";

import { StyledCheckbox, StyledListItemButton } from "./groupsWidget";
import { groupsActions, GroupsStatus, selectGroupsStatus } from "./groupsSlice";

export function Group({
    group,
    inset,
    editGroup,
    colorPickerPosition,
}: {
    group: CustomGroup;
    inset?: boolean;
    editGroup: () => void;
    colorPickerPosition: { top: number; left: number } | undefined;
}) {
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const status = useAppSelector(selectGroupsStatus);
    const dispatch = useAppDispatch();
    const { dispatch: dispatchCustomGroups } = useCustomGroups();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [colorPicker, toggleColorPicker] = useToggle();

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const [r, g, b] = vecToRgb(group.color);
    const disableChanges = status === GroupsStatus.Saving;

    return (
        <>
            <StyledListItemButton
                inset={inset}
                disableRipple
                disabled={disableChanges}
                onClick={() =>
                    dispatchCustomGroups(
                        customGroupsActions.update(group.id, { selected: !group.selected, hidden: group.selected })
                    )
                }
            >
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={group.name}>
                            <Typography noWrap={true}>{group.name}</Typography>
                        </Tooltip>
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            aria-label="toggle group highlighting"
                            size="small"
                            checked={group.selected}
                            disabled={disableChanges}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                                dispatchCustomGroups(
                                    customGroupsActions.update(group.id, {
                                        selected: !group.selected,
                                        hidden: !group.selected ? false : group.hidden,
                                    })
                                )
                            }
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
                            disabled={disableChanges}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                                dispatchCustomGroups(
                                    customGroupsActions.update(group.id, {
                                        hidden: !group.hidden,
                                        selected: !group.hidden ? false : group.selected,
                                    })
                                )
                            }
                        />
                    </Box>
                    <Box flex="0 0 auto">
                        <IconButton
                            color={Boolean(menuAnchor) ? "primary" : "default"}
                            size="small"
                            sx={{ py: 0 }}
                            aria-haspopup="true"
                            disabled={disableChanges}
                            onClick={openMenu}
                        >
                            <MoreVert />
                        </IconButton>
                    </Box>
                </Box>
            </StyledListItemButton>
            {colorPicker ? (
                <ColorPicker
                    position={colorPickerPosition}
                    color={group.color}
                    onChangeComplete={({ rgb }) =>
                        dispatchCustomGroups(
                            customGroupsActions.update(group.id, { color: rgbToVec([rgb.r, rgb.g, rgb.b]) })
                        )
                    }
                    onOutsideClick={toggleColorPicker}
                />
            ) : null}
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${group.id}-menu`}
            >
                <MenuList sx={{ maxWidth: "100%" }}>
                    {isAdmin ? (
                        <>
                            <MenuItem onClick={editGroup}>
                                <ListItemIcon>
                                    <Edit fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Edit</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => dispatch(groupsActions.setStatus([GroupsStatus.Deleting, group.id]))}
                            >
                                <ListItemIcon>
                                    <Delete fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Delete</ListItemText>
                            </MenuItem>
                        </>
                    ) : null}
                    <MenuItem onClick={toggleColorPicker}>
                        <ListItemIcon>
                            <ColorLens sx={{ color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Select color</ListItemText>
                    </MenuItem>
                </MenuList>
            </Menu>
        </>
    );
}
