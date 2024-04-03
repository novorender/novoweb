import { ReadonlyVec3, vec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, renderActions, selectCameraType } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { objIdsToTotalBoundingSphere } from "utils/objectData";

import { mapGuidsToIds } from "../utils";

export function useFlyToForm() {
    const {
        state: { view, db, scene },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);
    const [abortController] = useAbortController();

    return useCallback(
        async (payload: { location: ReadonlyVec3 } | { objectGuid: string }) => {
            if (!view || !db || !scene) {
                return;
            }

            let center: ReadonlyVec3;
            let radius: number;
            if ("location" in payload) {
                center = payload.location;
                radius = 10;
            } else {
                const objectIds = await mapGuidsToIds({
                    guids: [payload.objectGuid],
                    db,
                    abortSignal: abortController.current.signal,
                });
                const objectId = objectIds[payload.objectGuid];
                if (!objectId) {
                    return;
                }

                const boundingSphere = await objIdsToTotalBoundingSphere({
                    ids: [objectId],
                    abortSignal: abortController.current.signal,
                    db,
                    view,
                    flip: !vec3.equals(scene.up ?? [0, 1, 0], [0, 0, 1]),
                });
                if (!boundingSphere) {
                    return;
                }

                center = boundingSphere.center;
                radius = boundingSphere.radius;
            }

            if (cameraType === CameraType.Pinhole) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Pinhole,
                        zoomTo: {
                            center: center,
                            radius: radius,
                        },
                    })
                );
            } else {
                const cameraDir = getCameraDir(view.renderState.camera.rotation);
                const offsetDirection = vec3.normalize(vec3.create(), vec3.negate(vec3.create(), cameraDir));
                const offset = vec3.scale(vec3.create(), offsetDirection, radius * 2);
                const position = vec3.add(vec3.create(), center, offset);
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            ...view.renderState.camera,
                            position,
                            fov: radius * 2,
                        },
                    })
                );
            }
        },
        [dispatch, view, db, scene, abortController, cameraType]
    );
}
