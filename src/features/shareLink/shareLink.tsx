import { Close } from "@mui/icons-material";
import { Box, IconButton, ListItemIcon, ListItemText, MenuItem, Snackbar, Tooltip, Typography } from "@mui/material";
import { type ExplorerBookmarkState } from "@novorender/data-js-api";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { WidgetMenuButtonWrapper } from "components/widgetMenuButtonWrapper";
import { featuresConfig } from "config/features";
import { selectViewMode } from "features/render";
import { explorerActions, selectIsOnline } from "slices/explorer";
import { ViewMode } from "types/misc";

import { useShareLink } from "./useShareLink";

enum Status {
    Initial,
    Loading,
    Success,
}

export function ShareLink({
    variant = "default",
    nameKey = featuresConfig.shareLink.nameKey,
    explorerStateOverwrite = { forms: undefined },
    onClick,
}: {
    variant?: "default" | "primaryMenu" | "menuItem";
    nameKey?: string;
    explorerStateOverwrite?: Partial<ExplorerBookmarkState>;
    onClick?: () => void;
}) {
    const { t } = useTranslation();
    const { Icon, offline } = featuresConfig.shareLink;

    const viewMode = useAppSelector(selectViewMode);
    const isOnline = useAppSelector(selectIsOnline);
    const dispatch = useAppDispatch();
    const shareLink = useShareLink();

    const [status, setStatus] = useState(Status.Initial);

    const disabled = (!isOnline && !offline) || viewMode === ViewMode.Panorama;

    const createLink = async () => {
        if (status !== Status.Initial || disabled) {
            return;
        }

        setStatus(Status.Loading);

        const saved = await shareLink(explorerStateOverwrite);
        if (!saved) {
            setStatus(Status.Initial);
            return;
        }

        if (variant === "primaryMenu" || variant === "menuItem") {
            dispatch(explorerActions.setSnackbarMessage({ msg: t("copiedToClipboard") }));
        } else {
            setStatus(Status.Success);
        }
        onClick?.();
    };

    if (variant === "primaryMenu") {
        return (
            <Tooltip title={t(nameKey)} placement="top">
                <Box>
                    <IconButton onClick={createLink} disabled={disabled}>
                        <Icon />
                    </IconButton>
                </Box>
            </Tooltip>
        );
    }

    if (variant === "menuItem") {
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
