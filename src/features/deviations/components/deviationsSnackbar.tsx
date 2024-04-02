import { Close } from "@mui/icons-material";
import { IconButton, Snackbar } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AsyncStatus } from "types/misc";

import { deviationsActions, selectDeviationCalculationStatus, selectSaveStatus } from "../deviationsSlice";
import { DeviationCalculationStatus } from "../deviationTypes";

export function DeviationsSnackbar() {
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectSaveStatus);
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);
    const [message, close] =
        saveStatus.status === AsyncStatus.Error
            ? [saveStatus.msg, () => dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Initial }))]
            : saveStatus.status === AsyncStatus.Success
            ? [saveStatus.data, () => dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Initial }))]
            : calculationStatus.status === DeviationCalculationStatus.Error
            ? [
                  calculationStatus.error,
                  () =>
                      dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Initial })),
              ]
            : ["", undefined];

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
            autoHideDuration={message?.length > 100 ? 15000 : 7500}
            open={Boolean(message)}
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
