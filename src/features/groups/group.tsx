import { MouseEvent, useState } from "react";
import { useHistory } from "react-router-dom";
import { Delete, Edit, MoreVert, Visibility, ColorLens, LibraryAdd } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    css,
    IconButton,
    ListItemButton,
    ListItemButtonProps,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    styled,
    Typography,
} from "@mui/material";

import { Tooltip } from "components";
import { ColorPicker } from "features/colorPicker";
import { useAppSelector } from "app/store";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { rgbToVec, vecToRgb } from "utils/color";

export const StyledListItemButton = styled(ListItemButton)<ListItemButtonProps>(
    ({ theme }) => css`
        margin: 0;
        flex-grow: 0;
        padding: ${theme.spacing(0.5)} ${theme.spacing(4)} ${theme.spacing(0.5)} ${theme.spacing(1)};
    `
);

export const StyledCheckbox = styled(Checkbox)`
    padding-top: 0;
    padding-bottom: 0;
`;

export function Group({ group, disabled }: { group: CustomGroup; disabled: boolean }) {
    const history = useHistory();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const { dispatch: dispatchCustomGroups } = useCustomGroups();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const { r, g, b, a } = vecToRgb(group.color);

    return (
        <>
            <StyledListItemButton
                disableRipple
                disabled={disabled}
                onClick={() =>
                    dispatchCustomGroups(
                        customGroupsActions.update(group.id, {
                            selected: !group.selected,
                            hidden: !group.selected ? false : group.hidden,
                        })
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
                            disabled={disabled}
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
                            icon={<Visibility htmlColor={`rgba(${r}, ${g}, ${b}, ${Math.max(a ?? 0, 0.2)})`} />}
                            checkedIcon={<Visibility color="disabled" />}
                            checked={group.hidden}
                            disabled={disabled}
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
                            disabled={disabled}
                            onClick={openMenu}
                        >
                            <MoreVert />
                        </IconButton>
                    </Box>
                </Box>
            </StyledListItemButton>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={group.color}
                onChangeComplete={({ rgb }) =>
                    dispatchCustomGroups(customGroupsActions.update(group.id, { color: rgbToVec(rgb) }))
                }
            />
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${group.id}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%" } }}
            >
                {(isAdmin
                    ? [
                          <MenuItem
                              key="edit"
                              onClick={() => {
                                  history.push("/edit/" + group.id);
                              }}
                          >
                              <ListItemIcon>
                                  <Edit fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>Edit</ListItemText>
                          </MenuItem>,
                          <MenuItem
                              key="duplicate"
                              onClick={() => {
                                  dispatchCustomGroups(customGroupsActions.copy(group.id));
                                  closeMenu();
                              }}
                          >
                              <ListItemIcon>
                                  <LibraryAdd fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>Duplicate</ListItemText>
                          </MenuItem>,
                          <MenuItem key="delete" onClick={() => history.push("/delete/" + group.id)}>
                              <ListItemIcon>
                                  <Delete fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>Delete</ListItemText>
                          </MenuItem>,
                      ]
                    : []
                ).concat(
                    <MenuItem key="color" onClick={toggleColorPicker}>
                        <ListItemIcon>
                            <ColorLens sx={{ color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Select color</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
