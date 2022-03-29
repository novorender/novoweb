import { FormControlLabel } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { CameraType, renderActions, selectCameraType, selectSelectiongOrthoPoint } from "slices/renderSlice";

export function OrthoCam() {
    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle(false);

    const cameraType = useAppSelector(selectCameraType);
    const selectingOrthoPoint = useAppSelector(selectSelectiongOrthoPoint);
    const dispatch = useAppDispatch();

    const toggle = () => {
        if (cameraType === CameraType.Orthographic || selectingOrthoPoint) {
            dispatch(renderActions.setSelectingOrthoPoint(false));
            dispatch(renderActions.setCamera({ type: CameraType.Flight }));
        } else {
            dispatch(renderActions.setSelectingOrthoPoint(true));
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized}>
                <WidgetHeader minimized={minimized} toggleMinimize={toggleMinimize} widget={featuresConfig.orthoCam}>
                    {!menuOpen && !minimized ? (
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
                    ) : null}
                </WidgetHeader>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.orthoCam.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.orthoCam.key}-widget-menu-fab`}
            />
        </>
    );
}
