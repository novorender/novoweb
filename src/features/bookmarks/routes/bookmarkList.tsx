import { useHistory } from "react-router-dom";
import { FilterAlt, AddCircle, Save } from "@mui/icons-material";
import { Box, Button, List, ListItem, useTheme } from "@mui/material";
import { useState, MouseEvent, useEffect } from "react";

import { dataApi } from "app";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectUser } from "slices/authSlice";
import { selectEditingScene } from "slices/renderSlice";
import { useSceneId } from "hooks/useSceneId";

import {
    Filters,
    selectBookmarkFilters,
    selectBookmarks,
    BookmarksStatus,
    selectBookmarksStatus,
    BookmarkAccess,
    ExtendedBookmark,
} from "../bookmarksSlice";
import { FilterMenu } from "../filterMenu";
import { Bookmark } from "../bookmark";
import { useSelectBookmark } from "../useSelectBookmark";
import { bookmarksActions } from "..";

const filterMenuId = "bm-filter-menu";

export function BookmarkList() {
    const theme = useTheme();
    const history = useHistory();
    const handleSelect = useSelectBookmark();
    const sceneId = useSceneId();

    const status = useAppSelector(selectBookmarksStatus);
    const editingScene = useAppSelector(selectEditingScene);
    const user = useAppSelector(selectUser);
    const bookmarks = useAppSelector(selectBookmarks);
    const filters = useAppSelector(selectBookmarkFilters);
    const dispatch = useAppDispatch();

    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const [filteredBookmarks, setFilteredBookmarks] = useState(bookmarks);

    useEffect(
        function filterBookmarks() {
            setFilteredBookmarks(applyFilters(bookmarks, filters));
        },
        [bookmarks, filters]
    );

    const openFilters = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setFilterMenuAnchor(e.currentTarget);
    };

    const closeFilters = () => {
        setFilterMenuAnchor(null);
    };

    const handleSave = async () => {
        dispatch(bookmarksActions.setStatus(BookmarksStatus.Saving));

        try {
            const publicBmks = dataApi.saveBookmarks(
                editingScene?.id ? editingScene.id : sceneId,
                bookmarks.filter((bm) => bm.access !== BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
                { personal: false }
            );

            const personalBmks = dataApi.saveBookmarks(
                editingScene?.id ? editingScene.id : sceneId,
                bookmarks.filter((bm) => bm.access === BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
                { personal: true }
            );

            await Promise.all([publicBmks, personalBmks]);
            dispatch(bookmarksActions.setStatus(BookmarksStatus.Running));
        } catch {
            dispatch(bookmarksActions.setStatus(BookmarksStatus.Error));
        }
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                    <Box sx={{ mx: -1 }}>
                        <>
                            <Button
                                color="grey"
                                onClick={openFilters}
                                aria-haspopup="true"
                                aria-controls={filterMenuId}
                                aria-expanded={Boolean(filterMenuAnchor)}
                            >
                                <FilterAlt sx={{ mr: 1 }} />
                                Filters
                            </Button>
                            {user ? (
                                <>
                                    <Button
                                        color="grey"
                                        onClick={() => history.push("/create")}
                                        disabled={status !== BookmarksStatus.Running}
                                    >
                                        <AddCircle sx={{ mr: 1 }} />
                                        Add bookmark
                                    </Button>
                                    <Button
                                        color="grey"
                                        onClick={handleSave}
                                        disabled={status !== BookmarksStatus.Running}
                                    >
                                        <Save sx={{ mr: 1 }} />
                                        Save
                                    </Button>
                                </>
                            ) : null}
                        </>
                    </Box>
                </Box>
            </Box>
            <Box height={1}>
                {[BookmarksStatus.Loading, BookmarksStatus.Saving].includes(status) ? <LinearProgress /> : null}
                <ScrollBox flexDirection="column" pb={2} height={1}>
                    <List sx={{ width: 1 }}>
                        {[...(filteredBookmarks || [])]
                            .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }))
                            .map((bookmark, index) => (
                                <ListItem
                                    key={bookmark.name + index}
                                    sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }}
                                    button
                                    onClick={() => handleSelect(bookmark)}
                                >
                                    <Bookmark bookmark={bookmark} />
                                </ListItem>
                            ))}
                    </List>
                </ScrollBox>
            </Box>
            <FilterMenu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={closeFilters}
                id={filterMenuId}
            />
        </>
    );
}

function applyFilters(bookmarks: ExtendedBookmark[], filters: Filters): ExtendedBookmark[] {
    const titleMatcher = new RegExp(filters.title, "gi");

    return bookmarks.filter((bm) => {
        if (filters.title) {
            if (!titleMatcher.test(bm.name)) {
                return false;
            }
        }

        if (filters.personal) {
            if (bm.access !== BookmarkAccess.Personal) {
                return false;
            }
        }

        if (filters.public) {
            if (bm.access !== BookmarkAccess.Public) {
                return false;
            }
        }

        if (filters.measurements) {
            if (!(bm.measurement && bm.measurement.length)) {
                return false;
            }
        }

        if (filters.clipping) {
            if (!(bm.clippingVolume?.enabled && bm.clippingVolume.planes.length) && !bm.clippingPlanes?.enabled) {
                return false;
            }
        }

        if (filters.groups) {
            if (!bm.objectGroups?.filter((grp) => grp.id && (grp.hidden || grp.selected)).length) {
                return false;
            }
        }

        return true;
    });
}
