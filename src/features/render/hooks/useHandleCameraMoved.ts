import { useEffect, useRef } from "react";
import { View } from "@novorender/web_app";
import { quat, vec3 } from "gl-matrix";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { ViewMode } from "types/misc";

import { CameraType, renderActions, selectCameraType, selectSavedCameraPositions, selectViewMode } from "..";
import { flip, flipGLtoCadQuat } from "../utils";

export function useHandleCameraMoved() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);
    const viewMode = useAppSelector(selectViewMode);
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);

    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const orthoMovementTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(
        function initCameraMovedTracker() {
            if (!view) {
                return;
            }

            view.render = () => cameraMoved(view);

            function cameraMoved(view: View) {
                const hasMoved =
                    !vec3.equals(
                        view.renderState.camera.position,
                        flip(view.renderContext?.prevState?.camera.position ?? [0, 0, 0])
                    ) &&
                    !quat.equals(
                        view.renderState.camera.rotation,
                        flipGLtoCadQuat(view.renderContext?.prevState?.camera.rotation ?? [0, 0, 0, 0])
                    );

                if (!hasMoved) {
                    return;
                }
                // TODO
                // moveSvgMarkers();
                dispatch(renderActions.setStamp(null));

                if (movementTimer.current) {
                    clearTimeout(movementTimer.current);
                }

                if (orthoMovementTimer.current) {
                    clearTimeout(orthoMovementTimer.current);
                }

                orthoMovementTimer.current = setTimeout(() => {
                    if (cameraType !== CameraType.Orthographic || view.renderState.camera.kind !== "orthographic") {
                        return;
                    }

                    // TODO ORTHO

                    // Update elevation
                    // const mat = mat3.fromQuat(mat3.create(), view.camera.rotation);
                    // const up = [0, 1, 0] as vec3;
                    // const topDown = vec3.equals(vec3.fromValues(mat[6], mat[7], mat[8]), up);
                    // const elevation = topDown ? view.camera.controller.params.referenceCoordSys[13] : undefined;
                    // if (currentTopDownElevation !== elevation) {
                    //     dispatch(orthoCamActions.setCurrentTopDownElevation(elevation));
                    // }

                    // // Move grid
                    // const origo = vec3.clone(view.settings.grid.origo);
                    // const z = vec3.fromValues(mat[6], mat[7], mat[8]);
                    // const camPos = vec3.fromValues(
                    //     view.camera.controller.params.referenceCoordSys[12],
                    //     view.camera.controller.params.referenceCoordSys[13],
                    //     view.camera.controller.params.referenceCoordSys[14]
                    // );
                    // const delta = vec3.dot(z, vec3.sub(vec3.create(), camPos, origo));
                    // const newPos = vec3.scaleAndAdd(vec3.create(), origo, z, delta);
                    // dispatch(renderActions.setGrid({ origo: newPos }));
                }, 100);

                movementTimer.current = setTimeout(() => {
                    if (
                        cameraType !== CameraType.Flight ||
                        viewMode === ViewMode.Panorama ||
                        view.renderState.camera.kind !== "pinhole"
                    ) {
                        return;
                    }

                    const { position, rotation } = view.renderState.camera;
                    const lastPos = savedCameraPositions.positions[savedCameraPositions.currentIndex];

                    if (lastPos && vec3.equals(position, lastPos.position) && quat.equals(rotation, lastPos.rotation)) {
                        return;
                    }

                    dispatch(
                        renderActions.saveCameraPosition({
                            position: vec3.clone(position),
                            rotation: quat.clone(rotation),
                        })
                    );
                }, 500);
            }
        },
        [
            view,
            dispatch,
            // currentTopDownElevation,
            savedCameraPositions,
            cameraType,
            // advancedSettings,
            viewMode,
            // moveSvgMarkers,
        ]
    );
}
