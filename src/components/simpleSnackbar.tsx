import { Close } from "@mui/icons-material";
import { IconButton, Snackbar } from "@mui/material";
import { ReactNode } from "react";

export default function SimpleSnackbar({
    message,
    hideDuration,
    close,
}: {
    message?: ReactNode;
    hideDuration: number;
    close: () => void;
}) {
    const show = Boolean(message);

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
                "& > div": {
                    flexWrap: "nowrap",
                },
            }}
            autoHideDuration={hideDuration}
            open={true}
            onClose={close}
            message={message}
            action={
                <IconButton size="small" aria-label="close" color="inherit" onClick={close}>
                    <Close fontSize="small" />
                </IconButton>
            }
        />
    );
}
