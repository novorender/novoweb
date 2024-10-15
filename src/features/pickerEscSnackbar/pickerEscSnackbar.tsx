import { Close } from "@mui/icons-material";
import { Button, IconButton, Snackbar } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Picker, renderActions, selectPicker } from "features/render";

const localStorageKey = "pickerEscSnackbarDismissed";

const pickerTypes = [
    Picker.Area,
    Picker.ClippingPlane,
    Picker.Measurement,
    Picker.OutlineLaser,
    Picker.PointLine,
    Picker.Manhole,
];

export function PickerEscSnackbar() {
    const { t } = useTranslation();
    const picker = useAppSelector(selectPicker);
    const pickerRef = useRef(picker);
    pickerRef.current = picker;
    const [open, setOpen] = useState(false);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const dismissed = localStorage.getItem(localStorageKey) === "true";
        if (dismissed) {
            return;
        }

        if (pickerTypes.includes(picker)) {
            setOpen(true);
        }
    }, [picker]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape" && pickerTypes.includes(pickerRef.current)) {
                dispatch(renderActions.setPicker(Picker.Object));
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [dispatch]);

    const handleClose = () => {
        setOpen(false);
    };

    const dismiss = () => {
        setOpen(false);
        localStorage.setItem(localStorageKey, "true");
    };

    return (
        <>
            <Snackbar
                open={open}
                autoHideDuration={null}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{
                    width: { xs: "auto", sm: 350 },
                    bottom: { xs: "auto", sm: 88 },
                    top: { xs: 24, sm: "auto" },
                    pointerEvents: "auto",
                }}
                onClose={handleClose}
                message={
                    <>
                        {t("press") + " "}
                        <kbd>Escape</kbd>
                        {" " + t("toExitCurrentSelectionMode")}.
                    </>
                }
                action={
                    <>
                        <Button color="primary" size="small" variant="text" type="button" onClick={dismiss}>
                            {t("doNotShowAgainUppercase")}
                        </Button>
                        <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
                            <Close fontSize="small" />
                        </IconButton>
                    </>
                }
            />
        </>
    );
}
