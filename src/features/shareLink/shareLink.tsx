import { Close } from "@mui/icons-material";
import { IconButton, Snackbar, Typography } from "@mui/material";
import { CameraControllerParams, RenderSettings } from "@novorender/webgl-api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { WidgetMenuButtonWrapper } from "components";
import { featuresConfig } from "config/features";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { selectViewMode } from "features/render";
import { useSceneId } from "hooks/useSceneId";
import { ViewMode } from "types/misc";

enum Status {
    Initial,
    Loading,
    Success,
}

export function ShareLink() {
    const { Icon, name } = featuresConfig.shareLink;

    const createBookmark = useCreateBookmark();
    const viewMode = useAppSelector(selectViewMode);
    const sceneId = useSceneId();

    const [status, setStatus] = useState(Status.Initial);

    const createLink = async () => {
        if (status !== Status.Initial || viewMode === ViewMode.Panorama) {
            return;
        }

        const id = uuidv4();
        const bm = createBookmark();

        setStatus(Status.Loading);
        const blob = new Blob([`${window.location.origin}${window.location.pathname}?bookmarkId=${id}`], {
            type: "text/plain",
        });
        let saved: boolean = false;

        try {
            // Safari treats user activation differently:
            // https://bugs.webkit.org/show_bug.cgi?id=222262.
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/plain": new Promise(async (resolve) => {
                        saved = await dataApi.saveBookmarks(sceneId, [{ ...bm, id, name: id }], { group: id });

                        if (!saved) {
                            throw new Error("Failed to save bookmark");
                        }

                        resolve(blob);
                    }),
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
                activeElsewhere={viewMode === ViewMode.Panorama}
                onClick={createLink}
            >
                <IconButton size="large">
                    <Icon />
                </IconButton>
                <Typography>{name}</Typography>
            </WidgetMenuButtonWrapper>
        </>
    );
}

type UrlData = {
    camera?: CameraControllerParams;
    settings?: Partial<RenderSettings>;
    mainObject?: number;
};

export function getDataFromUrlHash(): UrlData {
    try {
        return window.location.hash ? JSON.parse(atob(window.location.hash.slice(1))) : {};
    } catch (e) {
        console.warn(e);
        return {};
    }
}
