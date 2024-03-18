import {
    ColorLens,
    Delete,
    Edit,
    LibraryAdd,
    MoreVert,
    Opacity,
    Texture,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    css,
    IconButton,
    ListItemButton,
    ListItemButtonProps,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Modal,
    styled,
    Typography,
} from "@mui/material";
import { TextureDescription } from "@novorender/api";
import { MouseEvent, useState } from "react";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { useAppSelector } from "app/store";
import { TextField, Tooltip } from "components";
import { GroupStatus, ObjectGroup, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { ColorPicker } from "features/colorPicker";
import { selectTextures } from "features/render";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
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
    const availableTextures = useAppSelector(selectTextures);
    const dispatchObjectGroups = useDispatchObjectGroups();

    const [pickTexture, togglePickTexture] = useToggle();

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

    const hidden = group.status === GroupStatus.Hidden;
    const selected = group.status === GroupStatus.Selected;

    return (
        <>
            <StyledListItemButton
                disableRipple
                disabled={disabled}
                onClick={() =>
                    dispatchObjectGroups(
                        objectGroupsActions.update(group.id, {
                            status: selected ? GroupStatus.None : GroupStatus.Selected,
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
                            name="toggle group highlighting"
                            aria-label="toggle group highlighting"
                            size="small"
                            checked={selected}
                            disabled={disabled}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: selected ? GroupStatus.None : GroupStatus.Selected,
                                    })
                                )
                            }
                        />
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            name="toggle group visibility"
                            aria-label="toggle group visibility"
                            size="small"
                            icon={<Visibility htmlColor={`rgba(${r}, ${g}, ${b}, ${Math.max(a ?? 0, 0.2)})`} />}
                            checkedIcon={
                                !group.opacity ? <VisibilityOff color="disabled" /> : <Visibility color="disabled" />
                            }
                            checked={hidden}
                            disabled={disabled}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: hidden ? GroupStatus.None : GroupStatus.Hidden,
                                    })
                                )
                            }
                        />
                    </Box>
                    <Box flex="0 0 auto">
                        <IconButton
                            color={menuAnchor ? "primary" : "default"}
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
                                <ListItemText>Hidden transparency</ListItemText>
                            </MenuItem>,
                            <MenuItem key="texture" onClick={() => history.replace(match.path + "/texture")}>
                                <ListItemIcon>
                                    <Texture fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Texture</ListItemText>
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
                                <ListItemText>{(1 - opacity) * 100}%</ListItemText>
                            </MenuItem>
                        ))}
                    </Route>
                    <Route path={match.path + "/texture"} exact>
                        <MenuItem sx={{ minWidth: 300 }}>
                            <Autocomplete
                                options={availableTextures.concat({ name: "none" } as TextureDescription)}
                                fullWidth
                                isOptionEqualToValue={(opt, val) => opt.name === val.name}
                                renderInput={(params) => <TextField required label="Texture" {...params} />}
                                disableCloseOnSelect={true}
                                getOptionLabel={(opt) => opt.name}
                                value={group.texture ?? null}
                                onChange={(_evt, textureDesc) => {
                                    if (!textureDesc) {
                                        return;
                                    }

                                    if (textureDesc.name === "none") {
                                        dispatchObjectGroups(
                                            objectGroupsActions.update(group.id, { texture: undefined })
                                        );
                                    } else {
                                        dispatchObjectGroups(
                                            objectGroupsActions.update(group.id, { texture: textureDesc })
                                        );
                                    }
                                }}
                            />
                        </MenuItem>
                    </Route>
                </Switch>
            </Menu>
            {pickTexture && (
                <Modal open={true} onClose={() => togglePickTexture(false)}>
                    <Box display="flex" justifyContent="center" alignItems="center" width={1} height={1}>
                        <Box
                            minWidth={400}
                            borderRadius="4px"
                            bgcolor={(theme) => theme.palette.common.white}
                            py={8}
                            px={{ xs: 2, sm: 8 }}
                            mx="auto"
                        >
                            <Typography mb={2} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                                Select texture
                            </Typography>
                            <Autocomplete
                                sx={{ mb: 2 }}
                                options={availableTextures.concat({ name: "none" } as TextureDescription)}
                                fullWidth
                                isOptionEqualToValue={(opt, val) => opt.name === val.name}
                                renderInput={(params) => <TextField required label="Texture" {...params} />}
                                getOptionLabel={(opt) => opt.name}
                                onChange={(_evt, textureDesc) => {
                                    if (!textureDesc) {
                                        return;
                                    }

                                    if (textureDesc.name === "none") {
                                        dispatchObjectGroups(
                                            objectGroupsActions.update(group.id, { texture: undefined })
                                        );
                                    } else {
                                        dispatchObjectGroups(
                                            objectGroupsActions.update(group.id, { texture: textureDesc })
                                        );
                                    }
                                }}
                            />
                            <Button fullWidth variant="contained" onClick={() => togglePickTexture(false)}>
                                Close
                            </Button>
                        </Box>
                    </Box>
                </Modal>
            )}
        </>
    );
}
