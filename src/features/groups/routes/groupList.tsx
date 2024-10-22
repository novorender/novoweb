import { AcUnit, AddCircle, CheckCircle, Delete, MoreVert, Save, Visibility } from "@mui/icons-material";
import {
    Box,
    Button,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    useTheme,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, WidgetBottomScrollBox } from "components";
import {
    GroupStatus,
    isInternalGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useObjectGroups,
} from "contexts/objectGroups";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { AsyncStatus } from "types/misc";

import { Collection } from "../collection";
import { Group, StyledCheckbox, StyledListItemButton } from "../group";
import {
    groupsActions,
    selectGroupsSelectedForEdit,
    selectIsEditingGroups,
    selectLoadingIds,
    selectSaveStatus,
} from "../groupsSlice";

export function GroupList() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.GroupManage);
    const loadingIds = useAppSelector(selectLoadingIds);
    const saveStatus = useAppSelector(selectSaveStatus);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const dispatchObjectGroups = useDispatchObjectGroups();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const isEditingGroups = useAppSelector(selectIsEditingGroups);
    const groupsSelectedForEdit = useAppSelector(selectGroupsSelectedForEdit);
    const dispatch = useAppDispatch();

    const collections = Array.from(
        objectGroups.reduce((set, grp) => {
            if (grp.grouping) {
                const collection = grp.grouping.split("/")[0];
                set.add(collection);
            }

            return set;
        }, new Set<string>()),
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const singles = objectGroups
        .filter((grp) => !grp.grouping)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));

    const isLoading = loadingIds || saveStatus === AsyncStatus.Loading;
    const allSelectedOrFrozen = objectGroups.every(
        (group) => group.status === GroupStatus.Selected || group.status === GroupStatus.Frozen,
    );
    const allHiddenOrFrozen = objectGroups.every(
        (group) => group.status === GroupStatus.Hidden || group.status === GroupStatus.Frozen,
    );
    const allFrozen = objectGroups.every((group) => group.status === GroupStatus.Frozen);

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleDeleteSelected = () => {
        if (groupsSelectedForEdit.size > 0) {
            history.push("/delete", { ids: [...groupsSelectedForEdit] });
        }
    };

    const allGroupsSelectedForEdit = useMemo(
        () => (isEditingGroups ? objectGroups.every((g) => groupsSelectedForEdit.has(g.id)) : false),
        [objectGroups, isEditingGroups, groupsSelectedForEdit],
    );

    const toggleSelectionForEdit = () => {
        const newIds = allGroupsSelectedForEdit ? [] : objectGroups.map((g) => g.id);
        dispatch(groupsActions.setGroupsSelectedForEdit(newIds));
    };

    return (
        <>
            {canManage ? (
                <Box boxShadow={theme.customShadows.widgetHeader}>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        {isEditingGroups ? (
                            <>
                                <Button
                                    color="grey"
                                    onClick={handleDeleteSelected}
                                    disabled={groupsSelectedForEdit.size === 0}
                                >
                                    <Delete sx={{ mr: 1 }} />
                                    {t("delete")}
                                </Button>
                                <Button
                                    color="grey"
                                    onClick={() => {
                                        dispatch(groupsActions.setEditingGroups(false));
                                        dispatch(groupsActions.setGroupsSelectedForEdit([]));
                                    }}
                                >
                                    {t("cancel")}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button disabled={isLoading} color="grey" onClick={() => history.push("/create")}>
                                    <AddCircle sx={{ mr: 1 }} />
                                    {t("addGroup")}
                                </Button>
                                <Button
                                    color="grey"
                                    onClick={() => dispatchObjectGroups(objectGroupsActions.groupSelected())}
                                    disabled={
                                        isLoading ||
                                        singles.filter((group) => group.status === GroupStatus.Selected).length < 2
                                    }
                                >
                                    <CheckCircle sx={{ mr: 1 }} />
                                    {t("groupSelected")}
                                </Button>
                                <Button disabled={isLoading} color="grey" onClick={() => history.push("/save")}>
                                    <Save sx={{ mr: 1 }} />
                                    {t("save")}
                                </Button>
                                <IconButton
                                    color={menuAnchor ? "primary" : "default"}
                                    size="small"
                                    aria-haspopup="true"
                                    sx={{ mr: 1 }}
                                    onClick={openMenu}
                                >
                                    <MoreVert />
                                </IconButton>

                                {canManage && (
                                    <Menu
                                        onClick={(e) => e.stopPropagation()}
                                        anchorEl={menuAnchor}
                                        open={Boolean(menuAnchor)}
                                        onClose={closeMenu}
                                        MenuListProps={{ sx: { maxWidth: "100%", minWidth: 100 } }}
                                        anchorOrigin={{
                                            vertical: "bottom",
                                            horizontal: "right",
                                        }}
                                        transformOrigin={{
                                            vertical: "top",
                                            horizontal: "right",
                                        }}
                                    >
                                        <MenuItem
                                            onClick={() => {
                                                dispatch(groupsActions.setEditingGroups(true));
                                                closeMenu();
                                            }}
                                            disabled={isLoading}
                                        >
                                            <ListItemIcon>
                                                <Delete fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText>{t("editGroups")}</ListItemText>
                                        </MenuItem>
                                    </Menu>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            ) : (
                <Box
                    boxShadow={theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
            )}

            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}

            <WidgetBottomScrollBox display="flex" flexDirection="column" height={1} pt={1} pb={2}>
                <StyledListItemButton
                    disableRipple
                    disabled={isLoading}
                    onClick={() => {
                        if (isEditingGroups) {
                            toggleSelectionForEdit();
                            return;
                        }

                        objectGroups
                            .filter((g) => g.status !== GroupStatus.Frozen)
                            .forEach((group) =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: allSelectedOrFrozen ? GroupStatus.None : GroupStatus.Selected,
                                    }),
                                ),
                            );
                    }}
                >
                    <Box display="flex" width={1} alignItems="center">
                        {isEditingGroups && (
                            <Box flex="0 0 auto">
                                <StyledCheckbox
                                    name="toggle group selection"
                                    aria-label="toggle group selection"
                                    size="small"
                                    checked={objectGroups.every((g) => groupsSelectedForEdit.has(g.id))}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={toggleSelectionForEdit}
                                />
                            </Box>
                        )}
                        <Box flex={"1 1 100%"}>
                            <Typography color="textSecondary" noWrap={true}>
                                {t("groupsName")} {objectGroups.length}
                            </Typography>
                        </Box>
                        {objectGroups.length ? (
                            <>
                                {allFrozen ? undefined : (
                                    <StyledCheckbox
                                        name="toggle all groups highlighting"
                                        aria-label="toggle all groups highlighting"
                                        size="small"
                                        checked={allSelectedOrFrozen}
                                        disabled={isLoading || isEditingGroups}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={() =>
                                            objectGroups
                                                .filter((g) => g.status !== GroupStatus.Frozen)
                                                .forEach((group) =>
                                                    dispatchObjectGroups(
                                                        objectGroupsActions.update(group.id, {
                                                            status: allSelectedOrFrozen
                                                                ? GroupStatus.None
                                                                : GroupStatus.Selected,
                                                        }),
                                                    ),
                                                )
                                        }
                                    />
                                )}
                                <StyledCheckbox
                                    name="toggle all groups visibility"
                                    aria-label="toggle all groups visibility"
                                    size="small"
                                    icon={allFrozen ? <AcUnit /> : <Visibility />}
                                    checkedIcon={<Visibility color="disabled" />}
                                    checked={allFrozen ? false : allHiddenOrFrozen}
                                    disabled={isLoading || allFrozen || isEditingGroups}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={() =>
                                        objectGroups
                                            .filter((g) => g.status !== GroupStatus.Frozen)
                                            .forEach((group) =>
                                                dispatchObjectGroups(
                                                    objectGroupsActions.update(group.id, {
                                                        status: allHiddenOrFrozen
                                                            ? GroupStatus.None
                                                            : GroupStatus.Hidden,
                                                    }),
                                                ),
                                            )
                                    }
                                />
                                <Box flex="0 0 auto" visibility={"hidden"}>
                                    <IconButton size="small" sx={{ py: 0 }}>
                                        <MoreVert />
                                    </IconButton>
                                </Box>
                            </>
                        ) : null}
                    </Box>
                </StyledListItemButton>
                {singles.map((grp) => (
                    <Group disabled={isLoading || isEditingGroups} group={grp} key={grp.id} />
                ))}
                {collections.map((collection) => (
                    <Collection disabled={isLoading || isEditingGroups} key={collection} collection={collection} />
                ))}
            </WidgetBottomScrollBox>
        </>
    );
}
