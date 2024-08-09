import { AddCircle, FilterAlt, Save } from "@mui/icons-material";
import { Box, Button, List, Typography, useTheme } from "@mui/material";
import { MouseEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { GroupStatus } from "contexts/objectGroups";
import { selectViewMode } from "features/render";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { selectHasAdminCapabilities } from "slices/explorer";
import { AsyncStatus, ViewMode } from "types/misc";

import { Bookmark } from "../bookmark";
import {
    BookmarkAccess,
    bookmarksActions,
    ExtendedBookmark,
    Filters,
    selectBookmarkFilters,
    selectBookmarks,
    selectBookmarksStatus,
    selectSaveStatus,
} from "../bookmarksSlice";
import { Collection } from "../collection";
import { FilterMenu } from "../filterMenu";

const filterMenuId = "bm-filter-menu";

export function BookmarkList() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();

    const viewMode = useAppSelector(selectViewMode);
    const saveStatus = useAppSelector(selectSaveStatus);
    const user = useAppSelector(selectUser);
    const bookmarks = useAppSelector(selectBookmarks);
    const bookmarksStatus = useAppSelector(selectBookmarksStatus);
    const filters = useAppSelector(selectBookmarkFilters);
    const dispatch = useAppDispatch();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const [filteredBookmarks, setFilteredBookmarks] = useState(bookmarks);

    useEffect(
        function filterBookmarks() {
            setFilteredBookmarks(applyFilters(bookmarks, filters));
        },
        [bookmarks, filters],
    );

    const openFilters = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setFilterMenuAnchor(e.currentTarget);
    };

    const closeFilters = () => {
        setFilterMenuAnchor(null);
    };

    const handleSave = async () => {
        dispatch(bookmarksActions.setSaveStatus({ status: AsyncStatus.Loading }));

        try {
            const publicBmks = isAdmin
                ? dataApi.saveBookmarks(
                      sceneId,
                      bookmarks
                          .filter((bm) => bm.access !== BookmarkAccess.Personal)
                          .map(({ access: _access, ...bm }) => bm),
                      { personal: false },
                  )
                : Promise.resolve(true);

            const personalBmks = dataApi.saveBookmarks(
                sceneId,
                bookmarks.filter((bm) => bm.access === BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
                { personal: true },
            );

            const [savedPublic, savedPersonal] = await Promise.all([publicBmks, personalBmks]);

            if (!savedPublic || !savedPersonal) {
                throw new Error("An error occurred while saving bookmarks.");
            }

            dispatch(bookmarksActions.setSaveStatus({ status: AsyncStatus.Success, data: null }));
        } catch (e) {
            console.warn(e);
            dispatch(
                bookmarksActions.setSaveStatus({
                    status: AsyncStatus.Error,
                    msg: "An error occurred while saving bookmarks.",
                }),
            );
        }
    };

    const collections = Array.from(
        filteredBookmarks.reduce((set, bookmark) => {
            if (bookmark.grouping) {
                const collection = bookmark.grouping.split("/")[0];
                set.add(collection);
            }

            return set;
        }, new Set<string>()),
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const singles = filteredBookmarks
        .filter((bookmark) => !bookmark.grouping)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));

    const isLoading = [saveStatus.status, bookmarksStatus].includes(AsyncStatus.Loading);
    const disableModifications = saveStatus.status !== AsyncStatus.Initial || bookmarksStatus !== AsyncStatus.Success;

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
                                {t("filters")}
                            </Button>
                            {user ? (
                                <>
                                    <Button
                                        color="grey"
                                        onClick={() => history.push("/create")}
                                        disabled={disableModifications || viewMode === ViewMode.Panorama}
                                    >
                                        <AddCircle sx={{ mr: 1 }} />
                                        {t("addBookmark")}
                                    </Button>
                                    <Button color="grey" onClick={handleSave} disabled={disableModifications}>
                                        <Save sx={{ mr: 1 }} />
                                        {t("save")}
                                    </Button>
                                </>
                            ) : null}
                        </>
                    </Box>
                </Box>
            </Box>
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox display="flex" flexDirection="column" height={1} pb={2}>
                {bookmarksStatus === AsyncStatus.Error && (
                    <>
                        <Typography p={1} mb={3}>
                            {t("anErrorOccurredWhileLoadingBookmarks.")}
                        </Typography>
                        <Box display={"flex"} justifyContent={"center"}>
                            <Button onClick={() => dispatch(bookmarksActions.setInitStatus(AsyncStatus.Initial))}>
                                {t("tryAgain")}
                            </Button>
                        </Box>
                    </>
                )}
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
