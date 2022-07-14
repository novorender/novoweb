import { FormEventHandler, useEffect, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { ScrollBox } from "components";
import { useToggle } from "hooks/useToggle";

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
    const [bmImg, setBmImg] = useState("");

    useEffect(() => {
        if (bmImg) {
            return;
        }

        if (bmToEdit) {
            setBmImg(bmToEdit.img ?? "");
        } else {
            createBookmarkImg(canvas).then((img) => setBmImg(img));
        }
    }, [bmImg, bmToEdit, canvas]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (bmToEdit) {
            update();
        } else {
            create();
        }

        history.goBack();
    };

    const create = async () => {
        if (!bookmarks) {
            return;
        }

        const bm = createBookmark(await createBookmarkImg(canvas));

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

    const update = async () => {
        if (!bookmarks) {
            return;
        }

        const img = await createBookmarkImg(canvas);

        const newBookmarks = bookmarks.map((bm) =>
            bm === bmToEdit
                ? {
                      ...createBookmark(img),
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
            <Box
                display="flex"
                justifyContent="center"
                width={1}
                sx={{ img: { maxHeight: 200, objectFit: "contain" } }}
            >
                {bmImg ? <img alt="" src={bmImg} /> : null}
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

async function createBookmarkImg(canvas: HTMLCanvasElement): Promise<string> {
    const isWindows = /\bWindows\b/.test(navigator.userAgent);
    let width = isWindows ? canvas.width : canvas.clientWidth;
    let height = isWindows ? canvas.height : canvas.clientHeight;
    let dx = 0;
    let dy = 0;

    if (height / width < 0.7) {
        dx = width - Math.round((height * 10) / 7);
    } else {
        dy = height - Math.round(width * 0.7);
    }

    const dist = document.createElement("canvas");
    dist.height = 70;
    dist.width = 100;
    const ctx = dist.getContext("2d", { alpha: true, desynchronized: false })!;
    ctx.drawImage(
        canvas,
        Math.round(dx / 2),
        Math.round(dy / 2),
        width - dx,
        height - dy,
        0,
        0,
        dist.width,
        dist.height
    );

    return dist.toDataURL("image/jpeg");
}
