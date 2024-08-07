import { Close } from "@mui/icons-material";
import { IconButton, Snackbar, Typography } from "@mui/material";
import { useState } from "react";

import { useSaveBookmarksMutation } from "apis/dataV2/dataV2Api";
import { useAppSelector } from "app/redux-store-interactions";
import { WidgetMenuButtonWrapper } from "components/widgetMenuButtonWrapper";
import { featuresConfig } from "config/features";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { selectViewMode } from "features/render";
import { useSceneId } from "hooks/useSceneId";
import { selectIsOnline } from "slices/explorer";
import { ViewMode } from "types/misc";

enum Status {
    Initial,
    Loading,
    Success,
}

export function ShareLink() {
    const { Icon, name, offline } = featuresConfig.shareLink;

    const createBookmark = useCreateBookmark();
    const viewMode = useAppSelector(selectViewMode);
    const isOnline = useAppSelector(selectIsOnline);
    const sceneId = useSceneId();
    const [saveBookmarks] = useSaveBookmarksMutation();

    const [status, setStatus] = useState(Status.Initial);

    const disabled = (!isOnline && !offline) || viewMode === ViewMode.Panorama;

    const createLink = async () => {
        if (status !== Status.Initial || disabled) {
            return;
        }

        const id = window.crypto.randomUUID();
        const bm = createBookmark();

        setStatus(Status.Loading);
        const blob = new Blob([`${window.location.origin}${window.location.pathname}?bookmarkId=${id}`], {
            type: "text/plain",
        });
        let saved = false;

        try {
            // Safari treats user activation differently:
            // https://bugs.webkit.org/show_bug.cgi?id=222262.
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/plain": (async () => {
                        await saveBookmarks({
                            projectId: sceneId,
                            bookmarks: [{ ...bm, id, name: id }],
                            group: id,
                        }).unwrap();

                        saved = true;
                        return blob;
                    })(),
                }),
            ]);
        } catch (e) {
            if (!saved) {
                console.warn(e);
                setStatus(Status.Initial);
                return;
            }

            navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ]);
        }

        setStatus(Status.Success);
    };

    return (
        <>
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{ width: { xs: "auto", sm: 350 }, bottom: { xs: "auto", sm: 24 }, top: { xs: 24, sm: "auto" } }}
                autoHideDuration={2500}
                open={status === Status.Success}
                onClose={() => setStatus(Status.Initial)}
                message="Copied to clipboard"
                action={
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={() => setStatus(Status.Initial)}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                }
            />
            <WidgetMenuButtonWrapper
                activeCurrent={status !== Status.Initial}
                activeElsewhere={disabled}
                onClick={createLink}
            >
                <IconButton disabled={disabled} size="large">
                    <Icon />
                </IconButton>
                <Typography>{name}</Typography>
            </WidgetMenuButtonWrapper>
        </>
    );
}
