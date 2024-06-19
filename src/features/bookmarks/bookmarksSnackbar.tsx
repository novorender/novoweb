import { Close } from "@mui/icons-material";
import { IconButton, Snackbar } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AsyncStatus } from "types/misc";

import { bookmarksActions, selectSaveStatus } from "./bookmarksSlice";

export function BookmarksSnackbar() {
    const saveStatus = useAppSelector(selectSaveStatus);
    const dispatch = useAppDispatch();

    const { status } = saveStatus;
    const show = status === AsyncStatus.Error || status === AsyncStatus.Success;

    if (!show) {
        return null;
    }

    const close = () => dispatch(bookmarksActions.setSaveStatus({ status: AsyncStatus.Initial }));

    return (
        <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
                width: { xs: "auto", sm: 350 },
                bottom: { xs: "auto", sm: 24 },
                top: { xs: 24, sm: "auto" },
                "& > div": {
                    flexWrap: "nowrap",
                },
            }}
            autoHideDuration={status === AsyncStatus.Success ? 1500 : 2500}
            open={true}
            onClose={close}
            message={
                status === AsyncStatus.Success
                    ? saveStatus.data ?? "Bookmarks successfully saved."
                    : saveStatus.msg ?? "An error occurred while saving bookmarks."
            }
            action={
                <IconButton size="small" aria-label="close" color="inherit" onClick={close}>
                    <Close fontSize="small" />
                </IconButton>
            }
        />
    );
}
