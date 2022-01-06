import { vec3, quat } from "gl-matrix";
import { FormEventHandler, Fragment, MouseEvent, useEffect, useRef, useState } from "react";
import {
    useTheme,
    List,
    ListItem,
    Box,
    Typography,
    Tooltip as MuiTooltip,
    styled,
    tooltipClasses,
    TooltipProps,
    Button,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    InputAdornment,
    Checkbox,
} from "@mui/material";
import { AddCircle, Delete, FilterAlt, MoreVert, Search } from "@mui/icons-material";
import type { Bookmark as BookmarkType } from "@novorender/data-js-api";
import { OrthoControllerParams, View } from "@novorender/webgl-api";
import { css } from "@mui/styled-engine";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { useAppDispatch, useAppSelector } from "app/store";
import { ScrollBox, Tooltip, WidgetContainer, LogoSpeedDial, WidgetHeader, TextField, Confirmation } from "components";
import { WidgetList } from "features/widgetList";

import {
    CameraType,
    ObjectVisibility,
    renderActions,
    selectBookmarks,
    selectDefaultVisibility,
    selectEditingScene,
    selectMainObject,
    selectMeasure,
} from "slices/renderSlice";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { highlightActions, useDispatchHighlighted, useLazyHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden, useLazyHidden } from "contexts/hidden";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDispatchVisible, visibleActions } from "contexts/visible";

const Description = styled(Typography)(
    () => css`
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        flex: 1 1 100%;
        height: 0;
    `
);

const ImgTooltip = styled(({ className, ...props }: TooltipProps) => (
    <MuiTooltip {...props} classes={{ popper: className }} />
))(
    ({ theme }) => css`
        & .${tooltipClasses.tooltip} {
            max-width: none;
            background: ${theme.palette.common.white};
            padding: ${theme.spacing(1)};
            border-radius: 4px;
            border: 1px solid ${theme.palette.grey.A400};
        }
    `
);

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `
);

type Filters = {
    title: string;
    measurements: boolean;
    clipping: boolean;
    groups: boolean;
};

// TODO(OLA):
// Bor sikkert rydda her

export function Bookmarks() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();

    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view, scene },
    } = useExplorerGlobals(true);

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
        dataApi.saveBookmarks(editingScene?.id ? editingScene.id : scene.id, toSave);
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

function Bookmark({ bookmark, onDelete }: { bookmark: BookmarkType; onDelete: (bm: BookmarkType) => void }) {
    const theme = useTheme();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    return (
        <>
            <Box width={1} maxHeight={70} height={70} display="flex" alignItems="flex-start" overflow="hidden">
                <Box bgcolor={theme.palette.grey[200]} height={70} width={100} flexShrink={0} flexGrow={0}>
                    {bookmark.img ? (
                        <ImgTooltip
                            placement="bottom-end"
                            title={
                                <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                                    <Img alt="" src={bookmark.img} />
                                </Box>
                            }
                        >
                            <Img alt="" height="70px" width="100px" src={bookmark.img} />
                        </ImgTooltip>
                    ) : null}
                </Box>
                <Box ml={1} display="flex" flexDirection="column" flexGrow={1} width={0} height={1}>
                    <Box display="flex" width={1}>
                        <Tooltip disableInteractive title={bookmark.name}>
                            <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                {bookmark.name}
                            </Typography>
                        </Tooltip>
                        <IconButton
                            color={Boolean(menuAnchor) ? "primary" : "default"}
                            size="small"
                            sx={{ ml: "auto", py: 0 }}
                            aria-haspopup="true"
                            onClick={openMenu}
                        >
                            <MoreVert />
                        </IconButton>
                    </Box>
                    {bookmark.description ? (
                        <Tooltip disableInteractive title={bookmark.description}>
                            <Description>{bookmark.description}</Description>
                        </Tooltip>
                    ) : null}
                </Box>
            </Box>
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${bookmark.name}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%" } }}
            >
                <MenuItem onClick={() => onDelete(bookmark)}>
                    <ListItemIcon>
                        <Delete fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

function CreateBookmark({ onClose }: { onClose: () => void }) {
    const bookmarks = useAppSelector(selectBookmarks);
    const measurement = useAppSelector(selectMeasure);
    const editingScene = useAppSelector(selectEditingScene);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mainObject = useAppSelector(selectMainObject);
    const dispatch = useAppDispatch();

    const {
        state: { canvas, scene, view },
    } = useExplorerGlobals(true);
    const { state: customGroups } = useCustomGroups();
    const highlighted = useLazyHighlighted();
    const hidden = useLazyHidden();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const imgRef = useRef(createBookmarkImg(canvas));
    const bookmarkRef = useRef(
        createBookmark({
            view,
            mainObject,
            highlighted,
            hidden,
            customGroups,
            defaultVisibility,
            measurement,
            img: imgRef.current,
        })
    );

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        const toSave = bookmarks.concat({ ...bookmarkRef.current, name, description });

        dispatch(renderActions.setBookmarks(toSave));
        dataApi.saveBookmarks(editingScene?.id ? editingScene.id : scene.id, toSave);

        onClose();
    };

    return (
        <Box width={1} px={1} mt={2}>
            <Box sx={{ img: { width: "100%", height: 200, objectFit: "cover" } }}>
                <img alt="" src={imgRef.current} />
            </Box>
            <form onSubmit={handleSubmit}>
                <TextField
                    name="title"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    id={"bookmark-title"}
                    label={"Title"}
                    fullWidth
                    required
                    sx={{ my: 1 }}
                />
                <TextField
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    id={"bookmark-description"}
                    label={"Description"}
                    fullWidth
                    multiline
                    rows={4}
                    sx={{ mb: 2 }}
                />
                <Box display="flex">
                    <Button
                        color="grey"
                        type="button"
                        variant="outlined"
                        onClick={onClose}
                        fullWidth
                        size="large"
                        sx={{ marginRight: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={!name} color="primary" variant="contained" size="large">
                        Save
                    </Button>
                </Box>
            </form>
        </Box>
    );
}

function createBookmarkImg(canvas: HTMLCanvasElement): string {
    const dist = document.createElement("canvas");
    const width = canvas.width;
    const height = canvas.height;

    dist.height = 350;
    dist.width = (350 * height) / width;
    const ctx = dist.getContext("2d", { alpha: false, desynchronized: false })!;
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, dist.width, dist.height);

    return dist.toDataURL("image/png");
}

const createBookmark = ({
    view,
    highlighted,
    hidden,
    customGroups,
    mainObject,
    defaultVisibility,
    measurement,
    img,
}: {
    view: View;
    highlighted: ReturnType<typeof useLazyHighlighted>;
    hidden: ReturnType<typeof useLazyHidden>;
    customGroups: CustomGroup[];
    mainObject: number | undefined;
    defaultVisibility: ObjectVisibility;
    measurement: ReturnType<typeof selectMeasure>;
    img: string;
}): Omit<BookmarkType, "name" | "description"> => {
    const camera = view.camera;
    const { highlight: _highlight, ...clippingPlanes } = view.settings.clippingPlanes;
    const { ...clippingVolume } = view.settings.clippingVolume;
    const selectedOnly = defaultVisibility !== ObjectVisibility.Neutral;

    const objectGroups = customGroups
        .map(({ id, selected, hidden, ids }) => ({
            id,
            selected,
            hidden,
            ids: id ? undefined : ids,
        }))
        .concat({
            id: "",
            selected: true,
            hidden: false,
            ids: highlighted.current.idArr.concat(
                mainObject !== undefined && !highlighted.current.ids[mainObject] ? [mainObject] : []
            ),
        })
        .concat({
            id: "",
            selected: false,
            hidden: true,
            ids: hidden.current.idArr,
        });

    if (camera.kind === "pinhole") {
        const { kind, position, rotation, fieldOfView, near, far } = camera;

        return {
            img,
            objectGroups,
            selectedOnly,
            clippingVolume,
            clippingPlanes: {
                ...clippingPlanes,
                bounds: {
                    min: Array.from(clippingPlanes.bounds.min) as [number, number, number],
                    max: Array.from(clippingPlanes.bounds.max) as [number, number, number],
                },
            },
            camera: {
                kind,
                position: vec3.copy(vec3.create(), position),
                rotation: quat.copy(quat.create(), rotation),
                fieldOfView,
                near,
                far,
            },
            measurement: measurement.points.length > 0 ? measurement.points : undefined,
        };
    } else {
        const ortho = camera.controller.params as OrthoControllerParams;
        return {
            img,
            ortho,
            objectGroups,
            selectedOnly,
            clippingPlanes,
            clippingVolume,
            measurement: measurement.points.length > 0 ? measurement.points : undefined,
        };
    }
};

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
