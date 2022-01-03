import { useState, useCallback, RefCallback, FormEventHandler, MouseEvent } from "react";
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
    ListItemText,
    MenuItem,
    MenuList,
    Menu,
    ListItemIcon,
} from "@mui/material";
import { Search, Visibility, ColorLens, AddCircle, CheckCircle, MoreVert, Edit, Delete } from "@mui/icons-material";
import { css } from "@mui/styled-engine";
import { v4 as uuidv4 } from "uuid";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";

import {
    ScrollBox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    WidgetContainer,
    LogoSpeedDial,
    WidgetHeader,
    AdvancedSearchInputs,
    Divider,
} from "components";

import { ColorPicker } from "features/colorPicker";
import { WidgetList } from "features/widgetList";

import { useAppSelector } from "app/store";
import { selectIsAdminScene } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";

import { featuresConfig } from "config/features";
import { vecToRgb, rgbToVec, VecRGB } from "utils/color";
import { searchDeepByPatterns } from "utils/search";
import { useToggle } from "hooks/useToggle";
import { useMountedState } from "hooks/useMountedState";
import { useAbortController } from "hooks/useAbortController";

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
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const isAdmin = useAppSelector(selectIsAdminScene);

    const [creatingGroup, setCreatingGroup] = useState<boolean | string>(false);
    const [menuOpen, toggleMenu] = useToggle();
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

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.groups}>
                    {menuOpen ? null : creatingGroup !== false ? (
                        <CreateGroup
                            key={typeof creatingGroup === "string" ? creatingGroup : undefined}
                            id={typeof creatingGroup === "string" ? creatingGroup : undefined}
                            onClose={() => setCreatingGroup(false)}
                        />
                    ) : isAdmin ? (
                        <Box mx={-1}>
                            <Button color="grey" onClick={() => setCreatingGroup("")}>
                                <AddCircle sx={{ mr: 1 }} />
                                Add group
                            </Button>
                            <Button
                                color="grey"
                                onClick={handleGroupSelected}
                                disabled={organisedGroups.singles.filter((group) => group.selected).length < 2}
                            >
                                <CheckCircle sx={{ mr: 1 }} />
                                Group selected
                            </Button>
                            <Button color="grey">
                                <Search sx={{ mr: 1 }} />
                                Search
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box flexDirection="column" overflow="hidden" flexGrow={1} height={1}>
                    <ScrollBox
                        display={menuOpen ? "none" : "flex"}
                        flexDirection="column"
                        ref={containerRef}
                        height={1}
                        pb={2}
                    >
                        <List sx={{ width: 1, pb: 0 }}>
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
                                    handleChange={handleChange}
                                    group={group}
                                    colorPickerPosition={colorPickerPosition}
                                />
                            ))}
                        </List>
                        {Object.values(organisedGroups.grouped).length ? <Divider /> : null}
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
                                        <Box flex="0 0 auto">
                                            <IconButton size="small" sx={{ py: 0 }} aria-haspopup="true">
                                                <MoreVert />
                                            </IconButton>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box pr={3}>
                                            <List sx={{ padding: 0 }}>
                                                {grouping.groups.map((group, index) => (
                                                    <Group
                                                        key={group.name + index}
                                                        editGroup={() => setCreatingGroup(group.id)}
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
    editGroup,
    colorPickerPosition,
}: {
    group: CustomGroup;
    inset?: boolean;
    editGroup: () => void;
    colorPickerPosition: { top: number; left: number } | undefined;
    handleChange: (updated: CustomGroup[]) => void;
}) {
    const { dispatch: dispatchCustomGroups } = useCustomGroups();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [colorPicker, toggleColorPicker] = useToggle();
    const [r, g, b] = vecToRgb(group.color);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

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
                    <Box flex="0 0 auto">
                        <IconButton
                            color={Boolean(menuAnchor) ? "primary" : "default"}
                            size="small"
                            sx={{ py: 0 }}
                            aria-haspopup="true"
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
                    onChangeComplete={({ rgb }) => handleChange([changeColor(group, rgbToVec([rgb.r, rgb.g, rgb.b]))])}
                    onOutsideClick={toggleColorPicker}
                />
            ) : null}
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${group.id} menu`}
            >
                <MenuList sx={{ maxWidth: "100%" }}>
                    <MenuItem onClick={editGroup}>
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Edit</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => dispatchCustomGroups(customGroupsActions.delete(group.id))}>
                        <ListItemIcon>
                            <Delete fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </MenuItem>
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

enum Status {
    Initial,
    Searching,
}

function CreateGroup({ onClose, id }: { onClose: () => void; id?: string }) {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { state: customGroups, dispatch: dispatchCustomGroup } = useCustomGroups();
    const groupToEdit = id ? customGroups.find((group) => group.id === id) : undefined;
    console.log({ groupToEdit, id });
    const highlighted = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const [inputs, setInputs] = useState<SearchPattern[]>(
        groupToEdit?.search ?? [{ property: "", value: "", exact: true }]
    );
    const [status, setStatus] = useMountedState(Status.Initial);
    const [ids, setIds] = useMountedState([] as ObjectId[]);
    const [savedInputs, setSavedInputs] = useState<SearchPattern[]>([]);

    const [abortController, abort] = useAbortController();

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        const abortSignal = abortController.current.signal;

        setIds([]);
        setSavedInputs(inputs);
        setStatus(Status.Searching);

        await searchDeepByPatterns({
            abortSignal,
            scene,
            searchPatterns: inputs,
            callback: (result) => {
                setIds((state) => state.concat(result));
                dispatchHighlighted(highlightActions.add(result));
            },
        }).catch(() => {});

        setStatus(Status.Initial);
    };

    const createGroup = () => {
        const name = savedInputs.map((input) => `${input.property?.split("/").pop()} ${input.value}`).join(" + ");
        const newGroup: CustomGroup = {
            id: uuidv4(),
            name,
            ids,
            selected: true,
            hidden: false,
            search: [...savedInputs],
            color: [...highlighted.color],
        };

        dispatchCustomGroup(customGroupsActions.add(newGroup));
    };

    const updateGroup = () => {
        if (!groupToEdit) {
            return;
        }

        dispatchCustomGroup(customGroupsActions.update(groupToEdit.id, { search: [...savedInputs] }));
    };

    const disableSearch =
        status === Status.Searching || !inputs.filter((input) => input.property && input.value).length;

    return (
        <Box>
            <form onSubmit={handleSubmit}>
                <AdvancedSearchInputs inputs={inputs} setInputs={setInputs} />
                <Box my={1} display="flex">
                    <Button
                        color="grey"
                        sx={{ padding: 0, mr: 4 }}
                        onClick={() => setInputs((state) => state.concat([{ property: "", value: "", exact: true }]))}
                    >
                        <AddCircle sx={{ mr: 0.5 }} />
                        Add criteria
                    </Button>
                    <Button
                        color="grey"
                        sx={{ padding: 0 }}
                        onClick={groupToEdit ? updateGroup : createGroup}
                        disabled={!ids.length}
                    >
                        <AddCircle sx={{ mr: 0.5 }} />
                        {groupToEdit ? "Update" : "Create"} group {ids.length ? `(${ids.length})` : ""}
                    </Button>
                </Box>
                <Box display="flex" mb={1}>
                    {status === Status.Initial ? (
                        <Button
                            onClick={onClose}
                            color="grey"
                            type="button"
                            variant="outlined"
                            fullWidth
                            sx={{ marginRight: 1 }}
                        >
                            Close
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                abort();
                            }}
                            color="grey"
                            type="button"
                            variant="outlined"
                            fullWidth
                            sx={{ marginRight: 1 }}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" fullWidth disabled={disableSearch} color="primary" variant="contained">
                        Search
                    </Button>
                </Box>
            </form>
        </Box>
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
