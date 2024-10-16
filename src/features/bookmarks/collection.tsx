import { Clear, Edit, MoreVert } from "@mui/icons-material";
import { Box, IconButton, List, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";

import { Bookmark } from "./bookmark";
import { bookmarksActions, ExtendedBookmark, selectIsCollectionExpanded } from "./bookmarksSlice";

export function Collection({ collection, bookmarks }: { collection: string; bookmarks: ExtendedBookmark[] }) {
    const history = useHistory();
    const { t } = useTranslation();
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.BookmarkManage);
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
        bookmarks.reduce((set, bookmark) => {
            if (bookmark.grouping !== collection && bookmark.grouping?.startsWith(collection + "/")) {
                const nestedCollection = bookmark.grouping
                    .split("/")
                    .slice(0, currentDepth + 1)
                    .join("/");
                set.add(nestedCollection);
            }

            return set;
        }, new Set<string>()),
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const name = collection.split("/").pop() ?? "";
    const collectionBookmarks = bookmarks.filter((bookmark) => bookmark.grouping === collection);

    return (
        <Accordion
            expanded={expanded}
            onChange={(_e, expand) =>
                expand
                    ? dispatch(bookmarksActions.expandCollection(collection))
                    : dispatch(bookmarksActions.closeCollection(collection))
            }
            level={currentDepth}
        >
            <AccordionSummary level={currentDepth}>
                <Box width={0} flex="1 1 auto" overflow="hidden">
                    <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                        {name}
                    </Box>
                </Box>
                <Box flex="0 0 auto" sx={{ visibility: canManage ? "visible" : "hidden" }}>
                    <IconButton
                        size="small"
                        sx={{ py: 0 }}
                        aria-haspopup="true"
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
                        <ListItemText>{t("rename")}</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            const path = collection.split("/");
                            const toUngroup = path.slice(-1)[0];
                            const regExp = new RegExp(`(${path.slice(0, -1).join("/")}/?)${toUngroup}/?`);

                            dispatch(
                                bookmarksActions.setBookmarks(
                                    bookmarks.map((bookmark) =>
                                        bookmark.grouping?.startsWith(collection)
                                            ? {
                                                  ...bookmark,
                                                  grouping: bookmark.grouping?.replace(regExp, "$1").replace(/\/$/, ""),
                                              }
                                            : bookmark,
                                    ),
                                ),
                            );

                            dispatch(bookmarksActions.closeCollection(collection));
                        }}
                    >
                        <ListItemIcon>
                            <Clear fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t("ungroup")}</ListItemText>
                    </MenuItem>
                </Menu>
            </AccordionSummary>
            <AccordionDetails sx={{ pb: 0 }}>
                <List sx={{ padding: 0 }}>
                    {[...collectionBookmarks]
                        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }))
                        .map((bookmark, index) => (
                            <Bookmark key={bookmark.name + index} bookmark={bookmark} />
                        ))}
                    {nestedCollections.length
                        ? nestedCollections.map((coll) => (
                              <Collection bookmarks={bookmarks} key={coll} collection={coll} />
                          ))
                        : null}
                </List>
            </AccordionDetails>
        </Accordion>
    );
}
