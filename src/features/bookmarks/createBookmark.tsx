import { FormEventHandler, useRef, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectBookmarks, selectEditingScene } from "slices/renderSlice";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import { useCreateBookmark } from "./useCreateBookmark";
import { BookmarkAccess, ExtendedBookmark } from "./bookmarks";

export function CreateBookmark({ onClose, bookmark }: { onClose: () => void; bookmark?: ExtendedBookmark }) {
    const bookmarks = useAppSelector(selectBookmarks);
    const editingScene = useAppSelector(selectEditingScene);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const dispatch = useAppDispatch();

    const {
        state: { canvas },
    } = useExplorerGlobals(true);
    const sceneId = useSceneId();
    const createBookmark = useCreateBookmark();

    const [name, setName] = useState(bookmark?.name ?? "");
    const [description, setDescription] = useState(bookmark?.description ?? "");
    const [personal, togglePersonal] = useToggle(bookmark ? bookmark.access === BookmarkAccess.Personal : true);
    const imgRef = useRef(bookmark ? bookmark.img ?? "" : createBookmarkImg(canvas));
    const bookmarkRef = useRef(bookmark ?? createBookmark(imgRef.current));

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (bookmark) {
            update();
        } else {
            create();
        }

        onClose();
    };

    const create = () => {
        if (!bookmarks) {
            return;
        }

        const newBookmarks = bookmarks.concat({
            ...bookmarkRef.current,
            name,
            description,
            access: personal ? BookmarkAccess.Personal : BookmarkAccess.Public,
        });

        dispatch(renderActions.setBookmarks(newBookmarks));
        dataApi.saveBookmarks(
            editingScene?.id ? editingScene.id : sceneId,
            newBookmarks
                .filter((bm) =>
                    personal ? bm.access === BookmarkAccess.Personal : bm.access === BookmarkAccess.Public
                )
                .map(({ access: _access, ...bm }) => bm),
            { personal }
        );
    };

    const update = () => {
        if (!bookmarks) {
            return;
        }

        const newBookmarks = bookmarks.map((bm) =>
            bm === bookmark
                ? {
                      ...bookmark,
                      name,
                      description,
                      access: personal ? BookmarkAccess.Personal : BookmarkAccess.Public,
                  }
                : bm
        );

        dispatch(renderActions.setBookmarks(newBookmarks));

        dataApi.saveBookmarks(
            editingScene?.id ? editingScene.id : sceneId,
            newBookmarks.filter((bm) => bm.access !== BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
            { personal: false }
        );

        dataApi.saveBookmarks(
            editingScene?.id ? editingScene.id : sceneId,
            newBookmarks.filter((bm) => bm.access === BookmarkAccess.Personal).map(({ access: _access, ...bm }) => bm),
            { personal: true }
        );
    };

    return (
        <Box width={1} px={1} mt={1}>
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
                    sx={{ mt: 1, mb: 2 }}
                />
                <TextField
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    id={"bookmark-description"}
                    label={"Description"}
                    fullWidth
                    multiline
                    rows={4}
                    sx={{ mb: 1 }}
                />
                {isAdmin ? (
                    <FormControlLabel
                        sx={{ mb: 2 }}
                        control={<Checkbox color="primary" checked={!personal} onChange={togglePersonal} />}
                        label={<Box mr={0.5}>Public</Box>}
                    />
                ) : null}
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
                        {bookmark ? "Save" : "Add"} bookmark
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
