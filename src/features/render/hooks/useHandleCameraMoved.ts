import { RenderState, View } from "@novorender/api";
import { mat3, quat, vec3 } from "gl-matrix";
import { MutableRefObject, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { measureActions } from "features/measure";
import { orthoCamActions, selectCurrentTopDownElevation } from "features/orthoCam";
import { ViewMode } from "types/misc";

import { renderActions, selectCameraType, selectClippingInEdit, selectViewMode } from "../renderSlice";
import { CameraType, DeepMutable } from "../types";

export function useHandleCameraMoved({
    engine2dRenderFnRef,
    containers,
}: {
    engine2dRenderFnRef: MutableRefObject<((moved: boolean, idleframe: boolean) => void) | undefined>;
    containers: ({ update: () => void } | null)[];
}) {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);
    const viewMode = useAppSelector(selectViewMode);
    const editClipping = useAppSelector(selectClippingInEdit);
    const currentTopDownElevation = useAppSelector(selectCurrentTopDownElevation);

    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const orthoMovementTimer = useRef<ReturnType<typeof setTimeout>>();

    const prevCameraType = useRef(cameraType);
    const prevCameraDir = useRef<Vec3>(vec3.create());
    const prevClippingPlaneW = useRef<number>(0);
    const first = useRef(true);

    useEffect(
        function initCameraMovedTracker() {
            if (!view) {
                return;
            }

            view.render = ({ isIdleFrame, cameraMoved }) => cameraMovedTrigger(isIdleFrame, cameraMoved, view);

            function cameraMovedTrigger(isIdleFrame: boolean, cameraMoved: boolean, view: View) {
                const moved = cameraMoved || prevCameraType.current !== cameraType;
                prevCameraType.current = cameraType;

                engine2dRenderFnRef.current?.(moved, isIdleFrame);

                if (!moved) {
                    return;
                }

                containers.forEach((container) => container && container.update());
                dispatch(renderActions.setStamp(null));
                dispatch(measureActions.selectHoverObj(undefined));

                if (movementTimer.current) {
                    clearTimeout(movementTimer.current);
                }

                if (orthoMovementTimer.current) {
                    clearTimeout(orthoMovementTimer.current);
                }

                orthoMovementTimer.current = setTimeout(() => {
                    if (
                        cameraType !== CameraType.Orthographic ||
                        view.renderState.camera.kind !== "orthographic" ||
                        editClipping
                    ) {
                        return;
                    }

                    const { camera } = view.renderState;

                    // Update elevation
                    const mat = mat3.fromQuat(mat3.create(), camera.rotation);
                    const up = [0, 0, 1] as vec3;
                    const topDown = vec3.equals(vec3.fromValues(mat[6], mat[7], mat[8]), up);
                    const elevation = topDown ? view.renderState.camera.position[2] : undefined;
                    if (currentTopDownElevation !== elevation) {
                        dispatch(orthoCamActions.setCurrentTopDownElevation(elevation));
                    }

                    // Move grid
                    const origin = vec3.clone(view.renderState.grid.origin);
                    const z = vec3.fromValues(mat[6], mat[7], mat[8]);
                    const camPos = vec3.clone(camera.position);
                    const delta = vec3.dot(z, vec3.sub(vec3.create(), camPos, origin));
                    const newPos = vec3.scaleAndAdd(vec3.create(), origin, z, delta);
                    dispatch(renderActions.setGrid({ origin: newPos }));

                    // Move clipping plane
                    const plane = view.renderState.clipping.planes[0];
                    if (plane) {
                        prevCameraDir.current = z;
                        const w = vec3.dot(z, camera.position);

                        if (
                            vec3.exactEquals(z, prevCameraDir.current) &&
                            Math.abs(w - prevClippingPlaneW.current) <= 0.001
                        ) {
                            return;
                        }
                        prevClippingPlaneW.current = w;

                        if (first.current) {
                            //Do not move clipping plane on startup
                            first.current = false;
                            return;
                        }

                        dispatch(
                            renderActions.setClippingPlanes({
                                planes: [
                                    { ...plane, normalOffset: [...z, w] as Vec4, baseW: w },
                                    ...view.renderState.clipping.planes.slice(1),
                                ] as DeepMutable<RenderState["clipping"]["planes"]>,
                            })
                        );
                    }
                }, 100);

                movementTimer.current = setTimeout(() => {
                    if (viewMode === ViewMode.Panorama) {
                        return;
                    }

                    const { position, rotation, fov } = view.renderState.camera;

                    dispatch(
                        renderActions.saveCameraPosition({
                            kind: cameraType,
                            position: vec3.clone(position),
                            rotation: quat.clone(rotation),
                            fov,
                        })
                    );
                }, 500);
            }
        },
        [view, dispatch, currentTopDownElevation, cameraType, viewMode, engine2dRenderFnRef, editClipping, containers]
    );
}
