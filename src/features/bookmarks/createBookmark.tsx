import { vec3, quat } from "gl-matrix";
import { FormEventHandler, useRef, useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import type { Bookmark as BookmarkType } from "@novorender/data-js-api";
import { OrthoControllerParams, View } from "@novorender/webgl-api";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import {
    ObjectVisibility,
    renderActions,
    selectBookmarks,
    selectDefaultVisibility,
    selectEditingScene,
    selectMainObject,
    selectMeasure,
} from "slices/renderSlice";
import { useCustomGroups, CustomGroup } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazyHidden } from "contexts/hidden";
import { useSceneId } from "hooks/useSceneId";

export function CreateBookmark({ onClose }: { onClose: () => void }) {
    const bookmarks = useAppSelector(selectBookmarks);
    const measurement = useAppSelector(selectMeasure);
    const editingScene = useAppSelector(selectEditingScene);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mainObject = useAppSelector(selectMainObject);
    const dispatch = useAppDispatch();

    const {
        state: { canvas, view },
    } = useExplorerGlobals(true);
    const sceneId = useSceneId();
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
        dataApi.saveBookmarks(editingScene?.id ? editingScene.id : sceneId, toSave);

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
