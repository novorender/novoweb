import { Clear, Edit, MoreVert, Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, IconButton, List, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { MouseEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { selectHasAdminCapabilities } from "slices/explorer";

import { Group, StyledCheckbox } from "./group";
import { groupsActions, selectIsCollectionExpanded } from "./groupsSlice";

export function Collection({ collection, disabled }: { collection: string; disabled: boolean }) {
    const history = useHistory();
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const expanded = useAppSelector((state) => selectIsCollectionExpanded(state, collection));
    const dispatch = useAppDispatch();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const currentDepth = collection.split("/").length;
    const nestedCollections = Array.from(
        objectGroups.reduce((set, grp) => {
            if (grp.grouping !== collection && grp.grouping?.startsWith(collection + "/")) {
                const nestedCollection = grp.grouping
                    .split("/")
                    .slice(0, currentDepth + 1)
                    .join("/");
                set.add(nestedCollection);
            }

            return set;
        }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const name = collection.split("/").pop() ?? "";
    const collectionGroups = objectGroups.filter((group) => group.grouping === collection);
    const nestedGroups = objectGroups.filter((group) => group.grouping?.startsWith(collection));
    const allSelected = nestedGroups.every((group) => group.status === GroupStatus.Selected);
    const allHidden = nestedGroups.every((group) => group.status === GroupStatus.Hidden);
    const allFullyHidden = nestedGroups.every((group) => group.opacity && group.opacity === 0);

    return (
        <Accordion
            expanded={expanded}
            onChange={(_e, expand) =>
                expand
                    ? dispatch(groupsActions.expandCollection(collection))
                    : dispatch(groupsActions.closeCollection(collection))
            }
            level={currentDepth}
        >
            <AccordionSummary level={currentDepth}>
                <Box width={0} flex="1 1 auto" overflow="hidden">
                    <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                        {name}
                    </Box>
                </Box>
                <Box flex="0 0 auto">
                    <StyledCheckbox
                        name="toggle group highlighting"
                        aria-label="toggle group highlighting"
                        sx={{ marginLeft: "auto" }}
                        size="small"
                        disabled={disabled}
                        onChange={() =>
                            nestedGroups.forEach((group) =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: allSelected ? GroupStatus.None : GroupStatus.Selected,
                                    })
                                )
                            )
                        }
                        checked={allSelected}
                        onClick={(event) => event.stopPropagation()}
                        onFocus={(event) => event.stopPropagation()}
                    />
                </Box>
                <Box flex="0 0 auto">
                    <StyledCheckbox
                        name="toggle group visibility"
                        aria-label="toggle group visibility"
                        size="small"
                        icon={<Visibility />}
                        checkedIcon={
                            allFullyHidden ? <VisibilityOff color="disabled" /> : <Visibility color="disabled" />
                        }
                        disabled={disabled}
                        onChange={() =>
                            nestedGroups.forEach((group) =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: allHidden ? GroupStatus.None : GroupStatus.Hidden,
                                    })
                                )
                            )
                        }
                        checked={allHidden}
                        onClick={(event) => event.stopPropagation()}
                        onFocus={(event) => event.stopPropagation()}
                    />
                </Box>
                <Box flex="0 0 auto" sx={{ visibility: isAdmin ? "visible" : "hidden" }}>
                    <IconButton
                        size="small"
                        sx={{ py: 0 }}
                        aria-haspopup="true"
                        disabled={disabled}
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
                    id={`${name}-menu`}
                    MenuListProps={{ sx: { maxWidth: "100%" } }}
                >
                    <MenuItem
                        onClick={() => {
                            history.push("/renameCollection", { collection });
                        }}
                    >
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Rename</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            const path = collection.split("/");
                            const toUngroup = path.slice(-1)[0];
                            const regExp = new RegExp(`(${path.slice(0, -1).join("/")}/?)${toUngroup}/?`);

                            nestedGroups.forEach((group) =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        grouping: group.grouping?.replace(regExp, "$1").replace(/\/$/, ""),
                                    })
                                )
                            );

                            dispatch(groupsActions.closeCollection(collection));
                        }}
                    >
                        <ListItemIcon>
                            <Clear fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Ungroup</ListItemText>
                    </MenuItem>
                </Menu>
            </AccordionSummary>
            <AccordionDetails sx={{ pb: 0 }}>
                <List sx={{ padding: 0 }}>
                    {[...collectionGroups]
                        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }))
                        .map((group, index) => (
                            <Group disabled={disabled} key={group.name + index} group={group} />
                        ))}
                    {nestedCollections.length
                        ? nestedCollections.map((coll) => (
                              <Collection disabled={disabled} key={coll} collection={coll} />
                          ))
                        : null}
                </List>
            </AccordionDetails>
        </Accordion>
    );
}
