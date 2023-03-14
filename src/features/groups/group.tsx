import { MouseEvent, useState } from "react";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";
import { Delete, Edit, MoreVert, Visibility, ColorLens, LibraryAdd, Opacity, VisibilityOff } from "@mui/icons-material";
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
import { ObjectGroup, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
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

export function Group({ group, disabled }: { group: ObjectGroup; disabled: boolean }) {
    const history = useHistory();
    const match = useRouteMatch();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const dispatchObjectGroups = useDispatchObjectGroups();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        history.replace(match.path);
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
                    dispatchObjectGroups(
                        objectGroupsActions.update(group.id, {
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
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
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
                            checkedIcon={
                                !group.opacity ? <VisibilityOff color="disabled" /> : <Visibility color="disabled" />
                            }
                            checked={group.hidden}
                            disabled={disabled}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
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
                onClose={() => setColorPickerAnchor(null)}
                color={group.color}
                onChangeComplete={({ rgb }) =>
                    dispatchObjectGroups(objectGroupsActions.update(group.id, { color: rgbToVec(rgb) }))
                }
            />
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${group.id}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%", minWidth: 100 } }}
            >
                <Switch>
                    <Route path={match.path} exact>
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
                                          dispatchObjectGroups(objectGroupsActions.copy(group.id));
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
                                <ListItemText>Color</ListItemText>
                            </MenuItem>,
                            <MenuItem key="opacity" onClick={() => history.replace(match.path + "/opacity")}>
                                <ListItemIcon>
                                    <Opacity fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Hidden opacity</ListItemText>
                            </MenuItem>
                        )}
                    </Route>
                    <Route path={match.path + "/opacity"} exact>
                        {[0, 0.25, 0.5, 0.75].map((opacity) => (
                            <MenuItem
                                selected={(group.opacity ?? 0) === opacity}
                                key={opacity}
                                onClick={() => {
                                    dispatchObjectGroups(objectGroupsActions.update(group.id, { opacity }));
                                }}
                            >
                                <ListItemText>{opacity * 100}%</ListItemText>
                            </MenuItem>
                        ))}
                    </Route>
                </Switch>
            </Menu>
        </>
    );
}
