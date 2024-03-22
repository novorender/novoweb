import { Close } from "@mui/icons-material";
import { IconButton, Snackbar } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AsyncStatus } from "types/misc";

import { deviationsActions, selectSaveStatus } from "../deviationsSlice";

export function DeviationsSnackbar() {
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectSaveStatus);
    const message =
        saveStatus.status === AsyncStatus.Error
            ? saveStatus.msg
            : saveStatus.status === AsyncStatus.Success
            ? saveStatus.data
            : "";

    if (!message) {
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
            autoHideDuration={message?.length > 100 ? 5000 : 2500}
            open={Boolean(message)}
            onClose={() => dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Initial }))}
            message={message}
            action={
                <IconButton
                    size="small"
                    aria-label="close"
                    color="inherit"
                    onClick={() => dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Initial }))}
                >
                    <Close fontSize="small" />
                </IconButton>
            }
        />
    );
}
