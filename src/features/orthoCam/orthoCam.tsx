import { Box, FormControlLabel, useTheme } from "@mui/material";
import { useAppDispatch, useAppSelector } from "app/store";

import { IosSwitch } from "components";
import { CameraType, renderActions, selectCameraType, selectSelectiongOrthoPoint } from "slices/renderSlice";

export function OrthoCam() {
    const theme = useTheme();
    const cameraType = useAppSelector(selectCameraType);
    const selectingOrthoPoint = useAppSelector(selectSelectiongOrthoPoint);
    const dispatch = useAppDispatch();

    const toggle = () => {
        if (cameraType === CameraType.Orthographic || selectingOrthoPoint) {
            dispatch(renderActions.setSelectingOrthoPoint(false));
            dispatch(renderActions.setCameraType(CameraType.Flight));
        } else {
            dispatch(renderActions.setSelectingOrthoPoint(true));
        }
    };

    return (
        <Box p={1} boxShadow={theme.customShadows.widgetHeader}>
            <FormControlLabel
                sx={{ marginLeft: 0 }}
                control={
                    <IosSwitch
                        checked={cameraType === CameraType.Orthographic || selectingOrthoPoint}
                        color="primary"
                        onChange={toggle}
                    />
                }
                labelPlacement="start"
                label={<div>2D mode</div>}
            />
        </Box>
    );
}
