import { useState, useCallback, RefCallback, useEffect, useRef } from "react";
import {
    List,
    Box,
    Typography,
    Checkbox,
    IconButton,
    styled,
    ListItemButtonProps,
    ListItemButton,
    Button,
} from "@mui/material";
import { Visibility, AddCircle, CheckCircle, MoreVert, Save } from "@mui/icons-material";
import { css } from "@mui/styled-engine";

import {
    ScrollBox,
    WidgetContainer,
    LogoSpeedDial,
    WidgetHeader,
    Divider,
    LinearProgress,
    Confirmation,
} from "components";
import { WidgetList } from "features/widgetList";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectEditingScene } from "slices/renderSlice";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";

import { CreateGroup } from "./createGroup";
import { Group } from "./group";
import { Rename } from "./rename";
import { GroupCollection } from "./groupCollection";
import { groupsActions, GroupsStatus, selectGroupsStatus } from "./groupsSlice";
import { useSceneId } from "hooks/useSceneId";

export const StyledListItemButton = styled(ListItemButton, { shouldForwardProp: (prop) => prop !== "inset" })<
    ListItemButtonProps & { inset?: boolean }
>(
    ({ inset, theme }) => css`
        margin: 0;
        padding: ${theme.spacing(0.5)} ${theme.spacing(inset ? 4 : 1)} ${theme.spacing(0.5)} ${theme.spacing(1)};
    `
);

export const StyledCheckbox = styled(Checkbox)`
    padding-top: 0;
    padding-bottom: 0;
`;

export function Groups() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const sceneId = useSceneId();

    const editingScene = useAppSelector(selectEditingScene);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const status = useAppSelector(selectGroupsStatus);
    const dispatch = useAppDispatch();

    const [menuOpen, toggleMenu] = useToggle();
    const [creatingGroup, setCreatingGroup] = useState<boolean | string>(false);
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useCallback<RefCallback<HTMLDivElement>>((el) => {
        setContainerEl(el);
    }, []);
    const initialized = useRef(false);

    const organisedGroups = organiseGroups(customGroups);
    const allGroupsSelected = customGroups.length > 0 && !customGroups.some((group) => !group.selected);
    const allGroupsHidden = customGroups.length > 0 && !customGroups.some((group) => !group.hidden);
    const colorPickerPosition = getPickerPosition(containerEl);
    const hasGrouping = customGroups.some((group) => group.grouping);

    useEffect(
        function updateSatus() {
            if (!initialized.current) {
                dispatch(groupsActions.setStatus(GroupsStatus.Initial));
                initialized.current = true;
            } else {
                dispatch(groupsActions.setStatus(GroupsStatus.Unsaved));
            }
        },
        [customGroups, dispatch]
    );

    const handleChange = (updatedGroups: CustomGroup[]) => {
        dispatchCustom(
            customGroupsActions.set(
                customGroups.map((group) => updatedGroups.find((updated) => updated.id === group.id) ?? group)
            )
        );
    };

    const handleGroupSelected = () => {
        let groupingNumber = 1;
        let name = `Grouping ${groupingNumber}`;

        while (organisedGroups.grouped[name]) {
            name = `Grouping ${++groupingNumber}`;
        }

        organisedGroups.singles
            .filter((group) => group.selected)
            .forEach((group) => dispatchCustom(customGroupsActions.update(group.id, { grouping: name })));
    };

    const handleSave = async () => {
        const id = editingScene && editingScene.id ? editingScene.id : sceneId;
        dispatch(groupsActions.setStatus(GroupsStatus.Saving));

        try {
            const { url: _url, objectGroups: originalGroups, ...originalScene } = await dataApi.loadScene(id);

            await dataApi.putScene({
                ...originalScene,
                url: `${id}:${scene.id}`,
                objectGroups: originalGroups.filter((grp) => !grp.id).concat(customGroups),
            });

            dispatch(groupsActions.setStatus(GroupsStatus.Initial));
        } catch {
            dispatch(groupsActions.setStatus(GroupsStatus.Error));
        }
    };

    const disableChanges = status === GroupsStatus.Saving;
    const hideExtendedHeader = menuOpen || Array.isArray(status);

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.groups}>
                    {hideExtendedHeader ? null : creatingGroup !== false ? (
                        <CreateGroup
                            key={typeof creatingGroup === "string" ? creatingGroup : undefined}
                            id={typeof creatingGroup === "string" ? creatingGroup : undefined}
                            onClose={() => setCreatingGroup(false)}
                        />
                    ) : isAdmin ? (
                        <Box mx={-1}>
                            <Button color="grey" onClick={() => setCreatingGroup("")} disabled={disableChanges}>
                                <AddCircle sx={{ mr: 1 }} />
                                Add group
                            </Button>
                            <Button
                                color="grey"
                                onClick={handleGroupSelected}
                                disabled={
                                    disableChanges ||
                                    organisedGroups.singles.filter((group) => group.selected).length < 2
                                }
                            >
                                <CheckCircle sx={{ mr: 1 }} />
                                Group selected
                            </Button>
                            <Button color="grey" onClick={handleSave} disabled={status !== GroupsStatus.Unsaved}>
                                <Save sx={{ mr: 1 }} />
                                Save
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>

                <Box
                    display={menuOpen ? "none" : "flex"}
                    flexDirection="column"
                    overflow="hidden"
                    flexGrow={1}
                    height={1}
                >
                    {Array.isArray(status) ? (
                        status[0] === GroupsStatus.Deleting ? (
                            <Confirmation
                                title="Delete group?"
                                confirmBtnText="Delete"
                                onCancel={() => dispatch(groupsActions.setStatus(GroupsStatus.Initial))}
                                onConfirm={() => dispatchCustom(customGroupsActions.delete(status[1]))}
                            />
                        ) : (
                            <Rename />
                        )
                    ) : (
                        <ScrollBox display="flex" flexDirection="column" ref={containerRef} height={1} pb={2}>
                            {status === GroupsStatus.Saving ? <LinearProgress /> : null}
                            <List sx={{ width: 1, pb: 0 }}>
                                <StyledListItemButton
                                    inset={hasGrouping}
                                    disableRipple
                                    disabled={disableChanges}
                                    onClick={() =>
                                        handleChange(
                                            customGroups.map((group) => ({
                                                ...group,
                                                selected: !allGroupsSelected,
                                                hidden: !allGroupsSelected ? false : group.hidden,
                                            }))
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
                                                    disabled={disableChanges}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={() =>
                                                        handleChange(
                                                            customGroups.map((group) => ({
                                                                ...group,
                                                                selected: !allGroupsSelected,
                                                                hidden: !allGroupsSelected ? false : group.hidden,
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
                                                    disabled={disableChanges}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={() =>
                                                        handleChange(
                                                            customGroups.map((group) => ({
                                                                ...group,
                                                                hidden: !allGroupsHidden,
                                                                selected: !allGroupsHidden ? false : group.selected,
                                                            }))
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

                                {organisedGroups.singles.map((group, index) => (
                                    <Group
                                        key={group.name + index}
                                        inset={hasGrouping}
                                        editGroup={() => setCreatingGroup(group.id)}
                                        group={group}
                                        colorPickerPosition={colorPickerPosition}
                                    />
                                ))}
                            </List>
                            {Object.values(organisedGroups.grouped).length ? <Divider /> : null}
                            {Object.values(organisedGroups.grouped).map((collection, index) => {
                                return (
                                    <GroupCollection
                                        key={collection.name + index}
                                        collection={collection}
                                        colorPickerPosition={colorPickerPosition}
                                        editGroup={(id) => setCreatingGroup(id)}
                                    />
                                );
                            })}
                        </ScrollBox>
                    )}
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.groups.key}
                    onSelect={toggleMenu}
                />
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

function getPickerPosition(el: HTMLElement | null) {
    if (!el) {
        return;
    }

    const { top, left } = el.getBoundingClientRect();
    return { top: top + 24, left: left + 24 };
}

export type OrganisedGroups = {
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
