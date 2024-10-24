import {
    AcUnit,
    ColorLens,
    Delete,
    Edit,
    LibraryAdd,
    MoreVert,
    Opacity,
    Visibility,
    VisibilityOff,
    WbSunny,
} from "@mui/icons-material";
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
    useTheme,
} from "@mui/material";
import { memo, MouseEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Tooltip } from "components";
import { GroupStatus, ObjectGroup, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { ColorPicker } from "features/colorPicker";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { rgbToVec, vecToRgb } from "utils/color";

import {
    groupsActions,
    selectGroupsSelectedForEdit,
    selectHighlightGroupInWidget,
    selectIsEditingGroups,
} from "./groupsSlice";

export const StyledListItemButton = styled(ListItemButton)<ListItemButtonProps>(
    ({ theme }) => css`
        margin: 0;
        flex-grow: 0;
        padding: ${theme.spacing(0.5)} ${theme.spacing(4)} ${theme.spacing(0.5)} ${theme.spacing(1)};
    `,
);

export const StyledCheckbox = styled(Checkbox)`
    padding: 0;
    margin-left: 9px;
    margin-right: 9px;
`;

function GroupRaw({ group, disabled }: { group: ObjectGroup; disabled: boolean }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.GroupManage);
    const dispatchObjectGroups = useDispatchObjectGroups();
    const dispatch = useAppDispatch();
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const isEditingGroups = useAppSelector(selectIsEditingGroups);
    const isSelectedForEdit = useAppSelector((store) => selectGroupsSelectedForEdit(store)?.has(group.id));

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const highlightGroupInWidget = useAppSelector(selectHighlightGroupInWidget);

    useEffect(() => {
        if (highlightGroupInWidget === group.id) {
            dispatch(groupsActions.setHighlightGroupInWidget(null));
            const btn = buttonRef.current;
            if (btn) {
                btn.scrollIntoView();
                btn.animate([{ background: theme.palette.primary.main }], {
                    duration: 250,
                    delay: 200,
                    direction: "alternate",
                    iterations: 2,
                });
            }
        }
    }, [dispatch, highlightGroupInWidget, group.id, theme]);

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

    const toggleSelectionForEdit = () => {
        if (!isEditingGroups) {
            return;
        }

        dispatch(groupsActions.toggleGroupSelectedForEdit(group.id));
    };

    const { r, g, b, a } = vecToRgb(group.color);

    const hidden = group.status === GroupStatus.Hidden;
    const selected = group.status === GroupStatus.Selected;

    return (
        <>
            <StyledListItemButton
                disableRipple
                disabled={disabled && !isEditingGroups}
                onClick={() => {
                    if (isEditingGroups) {
                        toggleSelectionForEdit();
                        return;
                    }
                    if (group.status === GroupStatus.Frozen) {
                        return;
                    }
                    dispatchObjectGroups(
                        objectGroupsActions.update(group.id, {
                            status: selected ? GroupStatus.None : GroupStatus.Selected,
                        }),
                    );
                }}
                ref={buttonRef}
            >
                {isEditingGroups && (
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            name="toggle group selection"
                            aria-label="toggle group selection"
                            size="small"
                            checked={isSelectedForEdit}
                            onClick={(event) => event.stopPropagation()}
                            onChange={toggleSelectionForEdit}
                        />
                    </Box>
                )}
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={group.name}>
                            <Typography noWrap={true}>{group.name}</Typography>
                        </Tooltip>
                    </Box>
                    <Box flex="0 0 auto">
                        {group.status === GroupStatus.Frozen ? undefined : (
                            <StyledCheckbox
                                name="toggle group highlighting"
                                aria-label="toggle group highlighting"
                                size="small"
                                checked={selected}
                                disabled={disabled || isEditingGroups}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() =>
                                    dispatchObjectGroups(
                                        objectGroupsActions.update(group.id, {
                                            status: selected ? GroupStatus.None : GroupStatus.Selected,
                                        }),
                                    )
                                }
                            />
                        )}
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            name="toggle group visibility"
                            aria-label="toggle group visibility"
                            size="small"
                            icon={
                                group.status === GroupStatus.Frozen ? (
                                    <AcUnit />
                                ) : (
                                    <Visibility htmlColor={`rgba(${r}, ${g}, ${b}, ${Math.max(a ?? 0, 0.2)})`} />
                                )
                            }
                            checkedIcon={
                                !group.opacity ? <VisibilityOff color="disabled" /> : <Visibility color="disabled" />
                            }
                            checked={hidden}
                            disabled={disabled || group.status === GroupStatus.Frozen || isEditingGroups}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: hidden ? GroupStatus.None : GroupStatus.Hidden,
                                    }),
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
                            disabled={disabled || isEditingGroups}
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
                        {(canManage
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
                                      <ListItemText>{t("edit")}</ListItemText>
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
                                      <ListItemText>{t("duplicate")}</ListItemText>
                                  </MenuItem>,
                                  <MenuItem key="delete" onClick={() => history.push("/delete", { ids: [group.id] })}>
                                      <ListItemIcon>
                                          <Delete fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText>{t("delete")}</ListItemText>
                                  </MenuItem>,
                              ]
                            : []
                        ).concat(
                            <MenuItem key="color" onClick={toggleColorPicker}>
                                <ListItemIcon>
                                    <ColorLens sx={{ color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("color")}</ListItemText>
                            </MenuItem>,
                            <MenuItem key="opacity" onClick={() => history.replace(match.path + "/opacity")}>
                                <ListItemIcon>
                                    <Opacity fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("hiddenTransparency")}</ListItemText>
                            </MenuItem>,
                            <MenuItem
                                key="frozen"
                                onClick={() => {
                                    dispatchObjectGroups(
                                        objectGroupsActions.update(group.id, {
                                            status:
                                                group.status === GroupStatus.Frozen
                                                    ? GroupStatus.None
                                                    : GroupStatus.Frozen,
                                        }),
                                    );
                                    closeMenu();
                                }}
                            >
                                <ListItemIcon>
                                    {group.status === GroupStatus.Frozen ? (
                                        <WbSunny fontSize="small" />
                                    ) : (
                                        <AcUnit fontSize="small" />
                                    )}
                                </ListItemIcon>
                                <ListItemText>
                                    {group.status === GroupStatus.Frozen ? "Unfreeze" : "Freeze"}
                                </ListItemText>
                            </MenuItem>,
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
                </Switch>
            </Menu>
        </>
    );
}

export const Group = memo(GroupRaw);
