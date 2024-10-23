import { vec3 } from "gl-matrix";
import { useMemo } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, selectCamera, selectClippingPlanes } from "features/render";

export function useIsCameraAlignedWithClippingPlane(planeIndex: number) {
    const camera = useAppSelector(selectCamera);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const plane = clippingPlanes.planes[planeIndex];

    return useMemo(() => {
        if (camera.type !== CameraType.Orthographic || !camera.goTo || !plane) {
            return false;
        }

        const cameraDir = getCameraDir(camera.goTo.rotation);
        const planeNormal = vec3.fromValues(plane.normalOffset[0], plane.normalOffset[1], plane.normalOffset[2]);
        return Math.abs(vec3.dot(cameraDir, planeNormal)) > 0.99;
    }, [camera, plane]);
}
