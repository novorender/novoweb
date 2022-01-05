import { vec3, quat } from "gl-matrix";
import { FormEventHandler, Fragment, useRef, useState } from "react";
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
} from "@mui/material";
import { AddCircle } from "@mui/icons-material";
import type { Bookmark } from "@novorender/data-js-api";
import { OrthoControllerParams, View } from "@novorender/webgl-api";
import { css } from "@mui/styled-engine";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { useAppDispatch, useAppSelector } from "app/store";
import { ScrollBox, Tooltip, Divider, WidgetContainer, LogoSpeedDial, WidgetHeader, TextField } from "components";
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
    const [menuOpen, toggleMenu] = useToggle();

    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const bookmarks = useAppSelector(selectBookmarks);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const dispatch = useAppDispatch();

    const [creatingBookmark, toggleCreatingBookmark] = useToggle();

    function handleSelect(bookmark: Bookmark) {
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

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.bookmarks}>
                    {isAdmin && !menuOpen && !creatingBookmark ? (
                        <Button color="grey" onClick={toggleCreatingBookmark}>
                            <AddCircle sx={{ mr: 1 }} />
                            Add bookmark
                        </Button>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen ? "none" : "flex"} height={1} pb={2}>
                    {creatingBookmark ? (
                        <CreateBookmark onClose={toggleCreatingBookmark} />
                    ) : (
                        <List sx={{ width: 1 }}>
                            {bookmarks.map((bookmark, index, array) => (
                                <Fragment key={bookmark.name + index}>
                                    <ListItem
                                        sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }}
                                        button
                                        onClick={() => handleSelect(bookmark)}
                                    >
                                        <Box
                                            width={1}
                                            maxHeight={80}
                                            display="flex"
                                            alignItems="flex-start"
                                            overflow="hidden"
                                        >
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

const CreateBookmark = ({ onClose }: { onClose: () => void }) => {
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

        const newBookmarks = bookmarks.concat({ ...bookmarkRef.current, name, description });

        dispatch(renderActions.setBookmarks(newBookmarks));
        dataApi.saveBookmarks(editingScene?.id || scene.id, newBookmarks);

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
};

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
}): Omit<Bookmark, "name" | "description"> => {
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
