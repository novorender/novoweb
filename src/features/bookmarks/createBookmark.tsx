import { FormEventHandler, useRef, useState } from "react";
import { Box, Button, TextField } from "@mui/material";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectBookmarks, selectEditingScene } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useSceneId } from "hooks/useSceneId";

import { useCreateBookmark } from "./useCreateBookmark";

export function CreateBookmark({ onClose }: { onClose: () => void }) {
    const bookmarks = useAppSelector(selectBookmarks);
    const editingScene = useAppSelector(selectEditingScene);
    const dispatch = useAppDispatch();

    const {
        state: { canvas },
    } = useExplorerGlobals(true);
    const sceneId = useSceneId();
    const createBookmark = useCreateBookmark();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const imgRef = useRef(createBookmarkImg(canvas));
    const bookmarkRef = useRef(createBookmark(imgRef.current));

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (bookmarks) {
            const toSave = bookmarks.concat({ ...bookmarkRef.current, name, description });

            dispatch(renderActions.setBookmarks(toSave));
            dataApi.saveBookmarks(editingScene?.id ? editingScene.id : sceneId, toSave);
        }
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
