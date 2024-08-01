import { BoundingSphere } from "@novorender/api";
import { glMatrix, vec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, renderActions, selectCameraType } from "features/render";

export default function useFlyTo() {
    const {
        state: { view },
    } = useExplorerGlobals(false);
    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    return useCallback(
        ({ sphere }: { sphere: BoundingSphere }) => {
            if (!view) {
                return;
            }

            if (cameraType === CameraType.Pinhole) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Pinhole,
                        zoomTo: sphere,
                    })
                );
            } else {
                const cameraDir = getCameraDir(view.renderState.camera.rotation);
                const pinholeFov = view.controllers.flight.fov;
                const dist = Math.max(sphere.radius / Math.tan(glMatrix.toRadian(pinholeFov) / 2), sphere.radius);
                const offset = -Math.min(dist, view.renderState.camera.far * 0.9);
                const position = vec3.scaleAndAdd(vec3.create(), sphere.center, cameraDir, offset);

                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            position,
                            rotation: view.renderState.camera.rotation,
                            fov: sphere.radius * 2,
                        },
                    })
                );
            }
        },
        [dispatch, view, cameraType]
    );
}
