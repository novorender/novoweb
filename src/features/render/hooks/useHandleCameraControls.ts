import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { panoramaControls, defaultOrthoControls } from "config/camera";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, selectAdvancedSettings, selectCameraType, selectViewMode } from "features/render/renderSlice";
import { ViewMode } from "types/misc";

export function useHandleCameraControls() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const viewMode = useAppSelector(selectViewMode);
    const cameraType = useAppSelector(selectCameraType);
    const { mouseButtonMap, fingerMap } = useAppSelector(selectAdvancedSettings);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (viewMode === ViewMode.Panorama) {
            view.camera.controller.mouseButtonsMap = panoramaControls.mouse;
            view.camera.controller.fingersMap = panoramaControls.touch;

            return;
        }

        if (cameraType === CameraType.Orthographic) {
            view.camera.controller.mouseButtonsMap = defaultOrthoControls.mouse;
            view.camera.controller.fingersMap = defaultOrthoControls.touch;
        } else {
            view.camera.controller.mouseButtonsMap = mouseButtonMap;
            view.camera.controller.fingersMap = fingerMap;
        }
    }, [view, cameraType, viewMode, mouseButtonMap, fingerMap]);
}
