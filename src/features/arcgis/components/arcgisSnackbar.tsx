import { Close } from "@mui/icons-material";
import { IconButton, Snackbar } from "@mui/material";
import { memo, useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisSaveStatus } from "../arcgisSlice";

export const ArcgisSnackbar = memo(function ArcgisSnackbar() {
    const saveStatus = useAppSelector(selectArcgisSaveStatus);
    const dispatch = useAppDispatch();

    const onClose = useCallback(() => dispatch(arcgisActions.setSaveStatus(AsyncStatus.Initial)), [dispatch]);
    const show = saveStatus === AsyncStatus.Error || saveStatus === AsyncStatus.Success;

    if (!show) {
        return null;
    }

    return (
        <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
                width: { xs: "auto", sm: 350 },
                bottom: { xs: "auto", sm: 24 },
                top: { xs: 24, sm: "auto" },
            }}
            autoHideDuration={2500}
            open={true}
            onClose={onClose}
            message={
                saveStatus === AsyncStatus.Error ? "Failed to save configuration" : "Configuration successfully saved"
            }
            action={
                <IconButton size="small" aria-label="close" color="inherit" onClick={onClose}>
                    <Close fontSize="small" />
                </IconButton>
            }
        />
    );
});
