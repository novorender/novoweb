import { Fragment, MouseEvent, useEffect, useState } from "react";
import { useTheme, List, ListItem, Typography, Button, Menu, MenuItem, InputAdornment, Checkbox } from "@mui/material";
import { AddCircle, FilterAlt, Search } from "@mui/icons-material";
import type { Bookmark as BookmarkType } from "@novorender/data-js-api";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";
import { useAppDispatch, useAppSelector } from "app/store";
import { ScrollBox, WidgetContainer, LogoSpeedDial, WidgetHeader, TextField, Confirmation } from "components";
import { WidgetList } from "features/widgetList";

import { CameraType, ObjectVisibility, renderActions, selectBookmarks, selectEditingScene } from "slices/renderSlice";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDispatchVisible, visibleActions } from "contexts/visible";

import { CreateBookmark } from "./createBookmark";
import { Bookmark } from "./bookmark";

type Filters = {
    title: string;
    measurements: boolean;
    clipping: boolean;
    groups: boolean;
};

export function Bookmarks() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();

    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const sceneId = useSceneId();

    const bookmarks = useAppSelector(selectBookmarks);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const editingScene = useAppSelector(selectEditingScene);
    const dispatch = useAppDispatch();

    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const [filters, setFilters] = useState({ title: "", measurements: false, clipping: false, groups: false });
    const [filteredBookmarks, setFilteredBookmarks] = useState(bookmarks);
    const [bookmarkToDelete, setBookmarkToDelete] = useState<BookmarkType>();
    const [creatingBookmark, toggleCreatingBookmark] = useToggle();

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

    function handleSelect(bookmark: BookmarkType) {
        dispatchVisible(visibleActions.set([]));

        const bmDefaultGroup = bookmark.objectGroups?.find((group) => !group.id && group.selected);
        dispatchHighlighted(highlightActions.setIds((bmDefaultGroup?.ids as number[] | undefined) ?? []));

        const bmHiddenGroup = bookmark.objectGroups?.find((group) => !group.id && group.hidden);
        dispatchHidden(hiddenGroupActions.setIds((bmHiddenGroup?.ids as number[] | undefined) ?? []));

        const updatedCustomGroups = customGroups.map((group) => {
            const bookmarked = bookmark.objectGroups?.find((bmGroup) => bmGroup.id === group.id);

            return {
                ...group,
                selected: bookmarked ? bookmarked.selected : false,
                hidden: bookmarked ? bookmarked.hidden : false,
            };
        });

        dispatchCustom(customGroupsActions.set(updatedCustomGroups));

        const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
        dispatch(renderActions.setMainObject(main));

        if (bookmark.selectedOnly !== undefined) {
            dispatch(
                renderActions.setDefaultVisibility(
                    bookmark.selectedOnly ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral
                )
            );
        }

        if (bookmark.measurement) {
            dispatch(renderActions.setMeasurePoints(bookmark.measurement));
        } else {
            dispatch(renderActions.setMeasurePoints([]));
        }

        if (bookmark.clippingPlanes) {
            view.applySettings({ clippingPlanes: { ...bookmark.clippingPlanes, highlight: -1 } });
            dispatch(renderActions.setClippingBox({ ...bookmark.clippingPlanes, highlight: -1, defining: false }));
        } else {
            dispatch(renderActions.resetClippingBox());
        }

        if (bookmark.clippingVolume) {
            const { enabled, mode, planes } = bookmark.clippingVolume;
            dispatch(renderActions.setClippingPlanes({ enabled, mode, planes: Array.from(planes), defining: false }));
        } else {
            dispatch(renderActions.setClippingPlanes({ defining: false, planes: [], enabled: false, mode: "union" }));
        }

        if (bookmark.ortho) {
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic, params: bookmark.ortho }));
        } else if (bookmark.camera) {
            dispatch(renderActions.setCamera({ type: CameraType.Flight, goTo: bookmark.camera }));
            dispatch(renderActions.setSelectingOrthoPoint(false));
        }
    }

    const handleDelete = () => {
        const toSave = bookmarks.filter((bm) => bm !== bookmarkToDelete);

        dispatch(renderActions.setBookmarks(toSave));
        setBookmarkToDelete(undefined);
        dataApi.saveBookmarks(editingScene?.id ? editingScene.id : sceneId, toSave);
    };

    const filtersOpen = Boolean(filterMenuAnchor) && !menuOpen && !creatingBookmark && !bookmarkToDelete;
    const filterMenuId = "filter-menu";
    const allFiltersChecked = filters.clipping && filters.groups && filters.measurements;
    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.bookmarks}>
                    {!menuOpen && !creatingBookmark && !bookmarkToDelete ? (
                        <>
                            <Button
                                color="grey"
                                onClick={openFilters}
                                aria-haspopup="true"
                                aria-controls={filterMenuId}
                                aria-expanded={filtersOpen ? "true" : undefined}
                            >
                                <FilterAlt sx={{ mr: 1 }} />
                                Filters
                            </Button>
                            {isAdmin ? (
                                <Button color="grey" onClick={toggleCreatingBookmark}>
                                    <AddCircle sx={{ mr: 1 }} />
                                    Add bookmark
                                </Button>
                            ) : null}
                        </>
                    ) : null}
                </WidgetHeader>
                <Menu
                    onClick={(e) => e.stopPropagation()}
                    anchorEl={filterMenuAnchor}
                    open={filtersOpen}
                    onClose={closeFilters}
                    id={filterMenuId}
                    MenuListProps={{ sx: { maxWidth: "100%", width: 360, pt: 0 } }}
                >
                    <MenuItem sx={{ background: theme.palette.grey[100] }}>
                        <TextField
                            autoFocus
                            fullWidth
                            variant="standard"
                            placeholder="Search"
                            value={filters.title}
                            onChange={(e) => setFilters((state) => ({ ...state, title: e.target.value }))}
                            InputProps={{
                                disableUnderline: true,
                                onKeyDown: (e) => e.stopPropagation(),
                                endAdornment: (
                                    <InputAdornment position="end" sx={{ mr: 1.2 }}>
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </MenuItem>
                    <MenuItem
                        onClick={() =>
                            setFilters((state) => ({
                                ...state,
                                measurements: !allFiltersChecked,
                                clipping: !allFiltersChecked,
                                groups: !allFiltersChecked,
                            }))
                        }
                        sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                        <Typography>All</Typography>
                        <Checkbox checked={allFiltersChecked} />
                    </MenuItem>
                    <MenuItem
                        onClick={() => setFilters((state) => ({ ...state, measurements: !state.measurements }))}
                        sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                        <Typography>Measure</Typography>
                        <Checkbox checked={filters.measurements} />
                    </MenuItem>
                    <MenuItem
                        onClick={() => setFilters((state) => ({ ...state, clipping: !state.clipping }))}
                        sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                        <Typography>Clipping</Typography>
                        <Checkbox checked={filters.clipping} />
                    </MenuItem>
                    <MenuItem
                        onClick={() => setFilters((state) => ({ ...state, groups: !state.groups }))}
                        sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                        <Typography>Groups</Typography>
                        <Checkbox checked={filters.groups} />
                    </MenuItem>
                </Menu>
                <ScrollBox display={menuOpen ? "none" : "flex"} height={1}>
                    {creatingBookmark ? (
                        <CreateBookmark onClose={toggleCreatingBookmark} />
                    ) : bookmarkToDelete ? (
                        <Confirmation
                            title="Delete bookmark?"
                            confirmBtnText="Delete"
                            onCancel={() => setBookmarkToDelete(undefined)}
                            onConfirm={handleDelete}
                        />
                    ) : (
                        <List sx={{ width: 1 }}>
                            {filteredBookmarks.map((bookmark, index) => (
                                <ListItem
                                    key={bookmark.name + index}
                                    sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }}
                                    button
                                    onClick={() => handleSelect(bookmark)}
                                >
                                    <Bookmark bookmark={bookmark} onDelete={setBookmarkToDelete} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.bookmarks.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.bookmarks.key}-widget-menu-fab`}
            />
        </>
    );
}

function applyFilters(bookmarks: BookmarkType[], filters: Filters): BookmarkType[] {
    const titleMatcher = new RegExp(filters.title, "gi");

    return bookmarks.filter((bm) => {
        if (filters.title) {
            if (!titleMatcher.test(bm.name)) {
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
