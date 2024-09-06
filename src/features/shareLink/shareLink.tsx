import { Close } from "@mui/icons-material";
import { IconButton, ListItemIcon, ListItemText, MenuItem, Snackbar, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { WidgetMenuButtonWrapper } from "components/widgetMenuButtonWrapper";
import { featuresConfig } from "config/features";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { selectViewMode } from "features/render";
import { useSceneId } from "hooks/useSceneId";
import { explorerActions, selectIsOnline } from "slices/explorer";
import { ViewMode } from "types/misc";

enum Status {
    Initial,
    Loading,
    Success,
}

export function ShareLink({ asMenuItem, onClick }: { asMenuItem?: boolean; onClick?: () => void }) {
    const { t } = useTranslation();
    const { Icon, nameKey, offline } = featuresConfig.shareLink;

    const createBookmark = useCreateBookmark();
    const viewMode = useAppSelector(selectViewMode);
    const isOnline = useAppSelector(selectIsOnline);
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();

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
                        saved = await dataApi.saveBookmarks(sceneId, [{ ...bm, id, name: id }], { group: id });

                        if (!saved) {
                            throw new Error("Failed to save bookmark");
                        }

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

        if (asMenuItem) {
            dispatch(explorerActions.setSnackbarMessage({ msg: t("copiedToClipboard") }));
        } else {
            setStatus(Status.Success);
        }
        onClick?.();
    };

    if (asMenuItem) {
        return (
            <MenuItem disabled={disabled} onClick={createLink}>
                <ListItemIcon>
                    <Icon />
                </ListItemIcon>
                <ListItemText>{t(nameKey)}</ListItemText>
            </MenuItem>
        );
    }

    return (
        <>
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{ width: { xs: "auto", sm: 350 }, bottom: { xs: "auto", sm: 24 }, top: { xs: 24, sm: "auto" } }}
                autoHideDuration={2500}
                open={status === Status.Success}
                onClose={() => setStatus(Status.Initial)}
                message={t("copiedToClipboard")}
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
                <Typography>{t(nameKey)}</Typography>
            </WidgetMenuButtonWrapper>
        </>
    );
}
