import { Autocomplete, Box, Button, Checkbox, FormControlLabel, useTheme } from "@mui/material";
import { FormEventHandler, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities } from "slices/explorer";

import { BookmarkAccess, bookmarksActions, selectBookmarks } from "../bookmarksSlice";
import { useCreateBookmark } from "../useCreateBookmark";

export function Crupdate() {
    const { id } = useParams<{ id?: string }>();
    const history = useHistory();
    const theme = useTheme();

    const bookmarks = useAppSelector(selectBookmarks);
    const bmToEdit = bookmarks.find((bm) => bm.id === id);

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const dispatch = useAppDispatch();
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);
    const createBookmark = useCreateBookmark();

    const [name, setName] = useState(bmToEdit?.name ?? "");
    const [description, setDescription] = useState(bmToEdit?.description ?? "");
    const [collection, setCollection] = useState(bmToEdit?.grouping ?? "");
    const [personal, togglePersonal] = useToggle(bmToEdit ? bmToEdit.access === BookmarkAccess.Personal : true);
    const [addToSelectionBasket, toggleAddToSelectionBasket] = useToggle(
        bmToEdit
            ? bmToEdit.explorerState
                ? bmToEdit.explorerState.options.addToSelectionBasket
                : bmToEdit.options?.addSelectedToSelectionBasket
            : false
    );
    const [bmImg, setBmImg] = useState("");

    const collections = Array.from(
        bookmarks.reduce((set, bookmark) => {
            if (bookmark.grouping) {
                bookmark.grouping.split("/").forEach((_collection, idx, arr) => {
                    set.add(arr.slice(0, -idx).join("/"));
                });

                set.add(bookmark.grouping);
            }

            return set;
        }, new Set<string>())
    )
        .filter((collection) => collection !== "")
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    useEffect(() => {
        if (bmImg) {
            return;
        }

        if (bmToEdit) {
            setBmImg(bmToEdit.img ?? "");
        } else {
            createBookmarkImg(canvas).then((img) => setBmImg(img));
        }
    }, [bmImg, bmToEdit, view, canvas]);

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
            id: window.crypto.randomUUID(),
            name,
            description,
            grouping: collection,
            access: personal ? BookmarkAccess.Personal : BookmarkAccess.Public,
            explorerState: {
                ...bm.explorerState!,
                options: { addToSelectionBasket: addToSelectionBasket },
            },
        });

        dispatch(bookmarksActions.setBookmarks(newBookmarks));
    };

    const update = async () => {
        if (!bookmarks) {
            return;
        }

        const bm = createBookmark(await createBookmarkImg(canvas));

        const newBookmarks = bookmarks.map((bookmark) =>
            bookmark === bmToEdit
                ? {
                      ...bm,
                      id: bmToEdit.id,
                      name,
                      description,
                      grouping: collection,
                      access: personal ? BookmarkAccess.Personal : BookmarkAccess.Public,
                      explorerState: {
                          ...bm.explorerState!,
                          options: { addToSelectionBasket: addToSelectionBasket },
                      },
                  }
                : bookmark
        );

        dispatch(bookmarksActions.setBookmarks(newBookmarks));
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
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

                    <Autocomplete
                        sx={{ mb: 2 }}
                        id="bookmark-collection"
                        options={collections}
                        value={collection}
                        onChange={(_e, value) => setCollection(value ?? "")}
                        freeSolo
                        size="small"
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                onChange={(e) => {
                                    setCollection(e.target.value);
                                }}
                                label="Collection"
                            />
                        )}
                    />

                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    checked={addToSelectionBasket}
                                    onChange={() => toggleAddToSelectionBasket()}
                                />
                            }
                            label={<Box mr={0.5}>Add selected to selection basket</Box>}
                        />
                    </Box>
                    {isAdmin ? (
                        <FormControlLabel
                            sx={{ mb: 2 }}
                            control={<Checkbox color="primary" checked={!personal} onChange={() => togglePersonal()} />}
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
                        <Button
                            type="submit"
                            fullWidth
                            disabled={!name}
                            color="primary"
                            variant="contained"
                            size="large"
                        >
                            {bmToEdit ? "Save" : "Add"} bookmark
                        </Button>
                    </Box>
                </form>
            </ScrollBox>
        </>
    );
}

async function createBookmarkImg(canvas: HTMLCanvasElement): Promise<string> {
    const width = canvas.width;
    const height = canvas.height;
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
