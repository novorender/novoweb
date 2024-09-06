import { Autocomplete, Box, Button, Checkbox, FormControlLabel, useTheme } from "@mui/material";
import { FormEventHandler, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities } from "slices/explorer";

import { BookmarkAccess, bookmarksActions, selectBookmarks } from "../bookmarksSlice";
import { useCreateBookmark } from "../useCreateBookmark";
import { createBookmarkImg } from "../utils";

export function Crupdate() {
    const { id } = useParams<{ id?: string }>();
    const history = useHistory();
    const theme = useTheme();

    const bookmarks = useAppSelector(selectBookmarks);
    const bmToEdit = bookmarks.find((bm) => bm.id === id);

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.BookmarkManage) ?? isAdmin;

    const dispatch = useAppDispatch();
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
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
            : false,
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
        }, new Set<string>()),
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
                : bookmark,
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
                            label={<Box mr={0.5}>{t("addSelectedToSelectionBasket")}</Box>}
                        />
                    </Box>
                    {canManage ? (
                        <FormControlLabel
                            sx={{ mb: 2 }}
                            control={<Checkbox color="primary" checked={!personal} onChange={() => togglePersonal()} />}
                            label={<Box mr={0.5}>{t("public")}</Box>}
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
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            fullWidth
                            disabled={!name}
                            color="primary"
                            variant="contained"
                            size="large"
                        >
                            {bmToEdit ? t("save") : t("add")} {t("bookmark")}
                        </Button>
                    </Box>
                </form>
            </ScrollBox>
        </>
    );
}
