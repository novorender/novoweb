import { CameraControllerParams, RenderSettings } from "@novorender/webgl-api";
import { Close } from "@mui/icons-material";
import { Snackbar, IconButton, Typography } from "@mui/material";
import { v4 as uuidv4 } from "uuid";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import { WidgetMenuButtonWrapper } from "components";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { useMountedState } from "hooks/useMountedState";
import { useSceneId } from "hooks/useSceneId";
import { useAppSelector } from "app/store";
import { selectEditingScene } from "slices/renderSlice";

enum Status {
    Initial,
    Loading,
    Success,
}

export function ShareLink() {
    const { Icon, name } = featuresConfig.shareLink;

    const createBookmark = useCreateBookmark();
    const sceneId = useSceneId();
    const editingScene = useAppSelector(selectEditingScene);

    const [status, setStatus] = useMountedState(Status.Initial);

    const createLink = async () => {
        if (editingScene) {
            return;
        }

        const id = uuidv4();
        const bm = createBookmark();

        try {
            setStatus(Status.Loading);

            await dataApi.saveBookmarks(sceneId, [{ ...bm, id, name: id }], { group: id });
            await navigator.clipboard.writeText(
                `${window.location.origin}${window.location.pathname}?bookmarkId=${id}`
            );

            setStatus(Status.Success);
        } catch (e) {
            console.warn(e);
            setStatus(Status.Initial);
        }
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
            <WidgetMenuButtonWrapper activeElsewhere={Boolean(editingScene)} onClick={createLink}>
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
