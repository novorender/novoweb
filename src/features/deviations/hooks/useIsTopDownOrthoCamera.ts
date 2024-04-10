import { useMemo } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, selectCamera } from "features/render";

export function useIsTopDownOrthoCamera() {
    const camera = useAppSelector(selectCamera);

    return useMemo(() => {
        if (camera.type !== CameraType.Orthographic || !camera.goTo) {
            return false;
        }
        const vec = getCameraDir(camera.goTo.rotation);
        return vec[2] <= -0.98;
    }, [camera]);
}
