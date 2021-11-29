import { FormEventHandler, forwardRef, Fragment, useRef, useState } from "react";
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
    Modal,
    Paper,
    FormControl,
    OutlinedInput,
} from "@mui/material";
import { AddCircle } from "@mui/icons-material";
import type { Bookmark } from "@novorender/data-js-api";
import { css } from "@mui/styled-engine";

import { ScrollBox, Tooltip, Divider } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import {
    CameraType,
    ObjectVisibility,
    renderActions,
    selectBookmarks,
    selectDefaultVisibility,
    selectEditingScene,
    selectMeasure,
} from "slices/renderSlice";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectIsAdminScene } from "slices/explorerSlice";
import { useToggle } from "hooks/useToggle";
import { dataApi } from "app";
import { OrthoControllerParams } from "@novorender/webgl-api";
import { vec3, quat } from "gl-matrix";

const Description = styled(Typography)(
    () => css`
        display: --webkit-box;
        overflow: hidden;
        --webkit-line-clamp: 2;
        --webkit-box-orient: vertical;
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

export function Bookmarks() {
    const theme = useTheme();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const bookmarks = useAppSelector(selectBookmarks);
    const isAdmin = useAppSelector(selectIsAdminScene);
    const dispatch = useAppDispatch();

    const [addingBookmark, toggleAddingBookmark] = useToggle();

    function handleSelect(bookmark: Bookmark) {
        if (bookmark.objectGroups) {
            const bmDefaultGroup = bookmark.objectGroups.find((group) => !group.id && group.selected);
            if (bmDefaultGroup?.ids) {
                dispatchHighlighted(highlightActions.setIds(bmDefaultGroup.ids as number[]));
            }

            const bmHiddenGroup = bookmark.objectGroups.find((group) => !group.id && group.hidden);
            if (bmHiddenGroup?.ids) {
                dispatchHidden(hiddenGroupActions.setIds(bmHiddenGroup.ids as number[]));
            }

            const updatedCustomGroups = customGroups.map((group) => {
                const bookmarked = bookmark.objectGroups!.find((bmGroup) => bmGroup.id === group.id);

                return {
                    ...group,
                    selected: bookmarked ? bookmarked.selected : false,
                    hidden: bookmarked ? bookmarked.hidden : false,
                };
            });

            dispatchCustom(customGroupsActions.set(updatedCustomGroups));

            const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
            dispatch(renderActions.setMainObject(main));
        }

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

    return (
        <>
            {isAdmin ? (
                <Box boxShadow={theme.customShadows.widgetHeader}>
                    <Button color="grey" onClick={toggleAddingBookmark}>
                        <AddCircle sx={{ mr: 1 }} />
                        Add bookmark
                    </Button>
                </Box>
            ) : (
                <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
            )}
            <ScrollBox height={1} pb={2}>
                <List>
                    {bookmarks.map((bookmark, index, array) => (
                        <Fragment key={bookmark.name + index}>
                            <ListItem
                                sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }}
                                button
                                onClick={() => handleSelect(bookmark)}
                            >
                                <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                                    <Box
                                        bgcolor={theme.palette.grey[200]}
                                        height={65}
                                        width={100}
                                        flexShrink={0}
                                        flexGrow={0}
                                    >
                                        {bookmark.img ? (
                                            <ImgTooltip
                                                placement="bottom-end"
                                                title={
                                                    <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                                                        <Img alt="" src={bookmark.img} />
                                                    </Box>
                                                }
                                            >
                                                <Img alt="" height="32px" width="32px" src={bookmark.img} />
                                            </ImgTooltip>
                                        ) : null}
                                    </Box>
                                    <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                                        <Tooltip disableInteractive title={bookmark.name}>
                                            <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                                {bookmark.name}
                                            </Typography>
                                        </Tooltip>
                                        {bookmark.description ? (
                                            <Tooltip disableInteractive title={bookmark.description}>
                                                <Description>{bookmark.description}</Description>
                                            </Tooltip>
                                        ) : null}
                                    </Box>
                                </Box>
                            </ListItem>
                            {index !== array.length - 1 ? (
                                <Box my={0.5} component="li">
                                    <Divider />
                                </Box>
                            ) : null}
                        </Fragment>
                    ))}
                </List>
            </ScrollBox>
            <Modal
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                open={addingBookmark}
                onClose={toggleAddingBookmark}
            >
                <AddNewBookmark onClose={toggleAddingBookmark} />
            </Modal>
        </>
    );
}

const AddNewBookmark = forwardRef<HTMLDivElement, { onClose: () => void }>(({ onClose }, ref) => {
    const bookmarks = useAppSelector(selectBookmarks);
    const measurement = useAppSelector(selectMeasure);
    const editingScene = useAppSelector(selectEditingScene);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const dispatch = useAppDispatch();

    const {
        state: { canvas, scene, view },
    } = useExplorerGlobals(true);
    const { state: customGroups } = useCustomGroups();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const imgRef = useRef(createBookmarkImg(canvas));

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        const newBookmarks = bookmarks.concat(createBookmark());

        dispatch(renderActions.setBookmarks(newBookmarks));
        dataApi.saveBookmarks(editingScene?.id || scene.id, newBookmarks);

        onClose();
    };

    const createBookmark = (): Bookmark => {
        const camera = view.camera;
        const { highlight: _highlight, ...clippingPlanes } = view.settings.clippingPlanes;
        const { ...clippingVolume } = view.settings.clippingVolume;
        const selectedOnly = defaultVisibility !== ObjectVisibility.Neutral;
        const img = imgRef.current;
        const objectGroups = customGroups.map(({ id, selected, hidden, ids }) => ({
            id,
            selected,
            hidden,
            ids: id ? undefined : ids,
        }));

        if (camera.kind === "pinhole") {
            const { kind, position, rotation, fieldOfView, near, far } = camera;

            return {
                name,
                description,
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
                name,
                description,
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

    return (
        <Paper ref={ref} sx={{ minWidth: 300, padding: 2 }}>
            <Typography variant="h5" textAlign="center" sx={{ mb: 2 }}>
                Add new bookmark
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    img: { height: 176, width: 176, objectFit: "contain" },
                }}
            >
                <img alt="" src={imgRef.current} />
            </Box>
            <form onSubmit={handleSubmit}>
                <Box mb={2}>
                    <FormControl fullWidth>
                        <label htmlFor="name">Name</label>
                        <OutlinedInput
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            type="text"
                            size="small"
                            autoFocus
                        />
                    </FormControl>
                </Box>
                <Box mb={2}>
                    <FormControl fullWidth>
                        <label htmlFor="description">Description</label>
                        <OutlinedInput
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            type="text"
                            size="small"
                        />
                    </FormControl>
                </Box>
                <Box display="flex">
                    <Button
                        color="grey"
                        type="button"
                        variant="outlined"
                        onClick={onClose}
                        fullWidth
                        sx={{ marginRight: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={!name} color="primary" variant="contained">
                        Save
                    </Button>
                </Box>
            </form>
        </Paper>
    );
});

function createBookmarkImg(canvas: HTMLCanvasElement): string {
    const dist = document.createElement("canvas");
    const width = canvas.width;
    const height = canvas.height;

    dist.height = 240;
    dist.width = (240 * height) / width;
    const ctx = dist.getContext("2d", { alpha: false, desynchronized: false })!;
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, dist.width, dist.height);

    return dist.toDataURL("image/png");
}
