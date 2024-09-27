import { Close } from "@mui/icons-material";
import { IconButton, Snackbar } from "@mui/material";
import { memo, useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { explorerActions, selectSnackbarMessage } from "slices/explorer";

export default memo(function GlobalSnackbar() {
    const message = useAppSelector(selectSnackbarMessage);

    const dispatch = useAppDispatch();

    const onClose = useCallback(() => dispatch(explorerActions.setSnackbarMessage(null)), [dispatch]);
    const show = message !== null;

    if (!show) {
        return null;
    }

    return (
        <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
                width: { xs: "auto", sm: 350 },
                bottom: { xs: "auto", sm: 88 },
                top: { xs: 24, sm: "auto" },
            }}
            autoHideDuration={message.closeAfter ?? 2500}
            open={true}
            onClose={onClose}
            message={message.msg}
            action={
                <IconButton size="small" aria-label="close" color="inherit" onClick={onClose}>
                    <Close fontSize="small" />
                </IconButton>
            }
        />
    );
});
