import { AddCircle, FilterAlt, Save } from "@mui/icons-material";
import { Box, Button, List, useTheme } from "@mui/material";
import { MouseEvent, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { GroupStatus } from "contexts/objectGroups";
import { selectViewMode } from "features/render";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { ViewMode } from "types/misc";

import { Bookmark } from "../bookmark";
import {
    BookmarkAccess,
    bookmarksActions,
    BookmarksStatus,
    ExtendedBookmark,
    Filters,
    selectBookmarkFilters,
    selectBookmarks,
    selectBookmarksStatus,
} from "../bookmarksSlice";
import { Collection } from "../collection";
import { FilterMenu } from "../filterMenu";

const filterMenuId = "bm-filter-menu";

export function BookmarkList() {
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();

    const viewMode = useAppSelector(selectViewMode);
    const status = useAppSelector(selectBookmarksStatus);
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
                sceneId,
                bookmarks.filter((bm) => bm.access !== BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
                { personal: false }
            );

            const personalBmks = dataApi.saveBookmarks(
                sceneId,
                bookmarks.filter((bm) => bm.access === BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
                { personal: true }
            );

            await Promise.all([publicBmks, personalBmks]);
            dispatch(bookmarksActions.setStatus(BookmarksStatus.Running));
        } catch {
            dispatch(bookmarksActions.setStatus(BookmarksStatus.Error));
        }
    };

    const collections = Array.from(
        filteredBookmarks.reduce((set, bookmark) => {
            if (bookmark.grouping) {
                const collection = bookmark.grouping.split("/")[0];
                set.add(collection);
            }

            return set;
        }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const singles = filteredBookmarks
        .filter((bookmark) => !bookmark.grouping)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));

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
                                        disabled={status !== BookmarksStatus.Running || viewMode === ViewMode.Panorama}
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
            {[BookmarksStatus.Loading, BookmarksStatus.Saving].includes(status) ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox display="flex" flexDirection="column" height={1} pb={2}>
                {singles.length > 0 && (
                    <List>
                        {singles.map((bookmark, idx) => (
                            <Bookmark bookmark={bookmark} key={bookmark.id ?? bookmark.name + idx} />
                        ))}
                    </List>
                )}
                {collections.map((collection) => (
                    <Collection bookmarks={filteredBookmarks} key={collection} collection={collection} />
                ))}
            </ScrollBox>
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

        if (bm.explorerState) {
            const { measurements, clipping, groups } = bm.explorerState;
            const hasArea =
                "points" in measurements.area
                    ? measurements.area.points.length > 0
                    : measurements.area.areas.length > 0;
            const hasPtLine =
                "points" in measurements.pointLine
                    ? measurements.pointLine.points.length > 0
                    : measurements.pointLine.pointLines.length > 0;

            if (filters.measurements) {
                if (
                    !hasArea &&
                    !hasPtLine &&
                    !measurements.measure.entities.length &&
                    measurements.manhole.id === undefined
                ) {
                    return false;
                }
            }

            if (filters.clipping) {
                if (!(clipping.enabled && clipping.planes.length)) {
                    return false;
                }
            }

            if (filters.groups) {
                if (!groups.filter((grp) => grp.id && grp.status !== GroupStatus.None).length) {
                    return false;
                }
            }
        } else {
            // LEGACY
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
        }

        return true;
    });
}
