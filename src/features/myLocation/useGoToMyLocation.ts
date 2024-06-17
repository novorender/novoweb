import { ReadonlyVec3, vec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, renderActions, selectCameraType } from "features/render";

export function useGoToMyLocation() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    return useCallback(
        (position: ReadonlyVec3) => {
            if (!view) {
                return;
            }

            if (cameraType === CameraType.Pinhole) {
                const cameraDir = getCameraDir(view.renderState.camera.rotation);
                const cameraPos = vec3.scaleAndAdd(vec3.create(), position, cameraDir, -20);

                dispatch(
                    renderActions.setCamera({
                        type: cameraType,
                        goTo: {
                            position: cameraPos,
                            rotation: view.renderState.camera.rotation,
                        },
                    })
                );
            } else {
                dispatch(
                    renderActions.setCamera({
                        type: cameraType,
                        goTo: {
                            position,
                            rotation: view.renderState.camera.rotation,
                            flyTime: 1000,
                        },
                    })
                );
            }
        },
        [view, cameraType, dispatch]
    );
}
