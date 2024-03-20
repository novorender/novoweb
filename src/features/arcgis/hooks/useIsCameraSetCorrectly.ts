import { useMemo } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, selectCamera } from "features/render";

export function useIsCameraSetCorrectly() {
    const camera = useAppSelector(selectCamera);

    const isCameraSetCorrectly = useMemo(() => {
        if (camera.type !== CameraType.Orthographic || !camera.goTo) {
            return false;
        }

        const dir = getCameraDir(camera.goTo.rotation);

        return dir[2] === -1;
    }, [camera]);

    return isCameraSetCorrectly;
}
