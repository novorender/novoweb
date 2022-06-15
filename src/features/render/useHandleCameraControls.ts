import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { panoramaControls, defaultOrthoControls } from "config/camera";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectActivePanorama } from "features/panoramas";
import { CameraType, selectAdvancedSettings, selectCameraType } from "slices/renderSlice";

export function useHandleCameraControls() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const activePanorama = useAppSelector(selectActivePanorama);
    const cameraType = useAppSelector(selectCameraType);
    const { mouseButtonMap, fingerMap } = useAppSelector(selectAdvancedSettings);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (activePanorama) {
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
    }, [view, cameraType, activePanorama, mouseButtonMap, fingerMap]);
}
