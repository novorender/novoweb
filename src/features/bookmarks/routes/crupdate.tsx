import { FormEventHandler, useRef, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { ScrollBox } from "components";
import { useToggle } from "hooks/useToggle";
import { v4 as uuidv4 } from "uuid";

import { useCreateBookmark } from "../useCreateBookmark";
import { BookmarkAccess, selectBookmarks, bookmarksActions } from "../bookmarksSlice";

export function Crupdate() {
    const { id } = useParams<{ id?: string }>();
    const history = useHistory();

    const bookmarks = useAppSelector(selectBookmarks);
    const bmToEdit = bookmarks.find((bm) => bm.id === id);

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const dispatch = useAppDispatch();

    const {
        state: { canvas },
    } = useExplorerGlobals(true);
    const createBookmark = useCreateBookmark();

    const [name, setName] = useState(bmToEdit?.name ?? "");
    const [description, setDescription] = useState(bmToEdit?.description ?? "");
    const [collection, setCollection] = useState(bmToEdit?.grouping ?? "");
    const [personal, togglePersonal] = useToggle(bmToEdit ? bmToEdit.access === BookmarkAccess.Personal : true);
    const imgRef = useRef(bmToEdit ? bmToEdit.img ?? "" : createBookmarkImg(canvas));

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (bmToEdit) {
            update();
        } else {
            create();
        }

        history.goBack();
    };

    const create = () => {
        if (!bookmarks) {
            return;
        }

        const bm = createBookmark(createBookmarkImg(canvas));

        const newBookmarks = bookmarks.concat({
            ...bm,
            id: uuidv4(),
            name,
            description,
            grouping: collection,
            access: personal ? BookmarkAccess.Personal : BookmarkAccess.Public,
        });

        dispatch(bookmarksActions.setBookmarks(newBookmarks));
    };

    const update = () => {
        if (!bookmarks) {
            return;
        }

        const newBookmarks = bookmarks.map((bm) =>
            bm === bmToEdit
                ? {
                      ...createBookmark(createBookmarkImg(canvas)),
                      id: bmToEdit.id,
                      name,
                      description,
                      grouping: collection,
                      access: personal ? BookmarkAccess.Personal : BookmarkAccess.Public,
                  }
                : bm
        );

        dispatch(bookmarksActions.setBookmarks(newBookmarks));
    };

    return (
        <ScrollBox width={1} px={1} mt={1} display="flex" flexDirection="column" height={1} pb={2}>
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
                    sx={{ mb: 2 }}
                />
                <TextField
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    id={"bookmark-collection"}
                    label={"Collection"}
                    fullWidth
                    autoComplete="off"
                    inputProps={{ list: "collections" }}
                    sx={{ mb: 1 }}
                />
                <datalist id="collections">
                    {Array.from(new Set(bookmarks.filter((bm) => bm.grouping).map((bm) => bm.grouping))).map((coll) => (
                        <option key={coll} value={coll} />
                    ))}
                </datalist>
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
                        onClick={() => history.goBack()}
                        fullWidth
                        size="large"
                        sx={{ marginRight: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={!name} color="primary" variant="contained" size="large">
                        {bmToEdit ? "Save" : "Add"} bookmark
                    </Button>
                </Box>
            </form>
        </ScrollBox>
    );
}

function createBookmarkImg(canvas: HTMLCanvasElement): string {
    const dist = document.createElement("canvas");
    const width = canvas.width;
    const height = canvas.height;

    dist.height = 350;
    dist.width = (350 * height) / width;
    const ctx = dist.getContext("2d", { alpha: true, desynchronized: false })!;
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, dist.width, dist.height);

    return dist.toDataURL("image/png");
}
