import { useHistory } from "react-router-dom";
import { FilterAlt, AddCircle, Save } from "@mui/icons-material";
import { Box, Button, List, useTheme } from "@mui/material";
import { useState, MouseEvent, useEffect } from "react";

import { dataApi } from "app";
import { Accordion, AccordionSummary, AccordionDetails, Divider, LinearProgress, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectUser } from "slices/authSlice";
import { useSceneId } from "hooks/useSceneId";

import {
    Filters,
    selectBookmarkFilters,
    selectBookmarks,
    BookmarksStatus,
    selectBookmarksStatus,
    BookmarkAccess,
    ExtendedBookmark,
    bookmarksActions,
} from "../bookmarksSlice";
import { FilterMenu } from "../filterMenu";
import { Bookmark } from "../bookmark";

const filterMenuId = "bm-filter-menu";

export function BookmarkList() {
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();

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
            <Box display="flex" flexDirection="column" height={1} pb={2}>
                {[BookmarksStatus.Loading, BookmarksStatus.Saving].includes(status) ? <LinearProgress /> : null}
                <ScrollBox display="flex" flexDirection="column" height={1} pb={2}>
                    {arrangeColllections(filteredBookmarks).map((collection) =>
                        !collection.name ? (
                            <List key="ungrouped">
                                {collection.bookmarks.map((bookmark, index) => (
                                    <Bookmark bookmark={bookmark} key={bookmark.name + index} />
                                ))}
                            </List>
                        ) : (
                            <Accordion key={collection.name}>
                                <AccordionSummary>{collection.name}</AccordionSummary>
                                <AccordionDetails>
                                    {collection.bookmarks.map((bookmark, index) => (
                                        <Bookmark bookmark={bookmark} key={bookmark.name + index} />
                                    ))}
                                </AccordionDetails>
                            </Accordion>
                        )
                    )}
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

type BmCollection = {
    name: string;
    bookmarks: ExtendedBookmark[];
};

function arrangeColllections(bookmarks: ExtendedBookmark[]): BmCollection[] {
    let done = [] as string[];

    return bookmarks
        .reduce((prev, curr, idx, arr) => {
            let toReturn = [...prev];

            if (idx === 0) {
                const ungrouped = arr
                    .filter((bm) => !bm.grouping)
                    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));
                toReturn = toReturn.concat({ name: "", bookmarks: ungrouped });
            }

            if (curr.grouping && !done.includes(curr.grouping)) {
                const collection = {
                    name: curr.grouping,
                    bookmarks: arr
                        .filter((bm) => bm.grouping === curr.grouping)
                        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" })),
                };

                toReturn = toReturn.concat(collection);
                done = done.concat(curr.grouping);
            }

            return toReturn;
        }, [] as BmCollection[])
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));
}
