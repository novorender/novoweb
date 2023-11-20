import { View } from "@novorender/api";
import { mat3, quat, vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useMove2DInteractions } from "features/engine2D";
import { orthoCamActions, selectCurrentTopDownElevation } from "features/orthoCam";
import { ViewMode } from "types/misc";

import {
    CameraType,
    DeepMutable,
    renderActions,
    RenderState,
    selectCameraType,
    selectSavedCameraPositions,
    selectViewMode,
} from "..";
import { useMoveMarkers } from "./useMoveMarkers";

export function useHandleCameraMoved({
    svg,
    engine2dRenderFn,
    interactionPositions,
}: {
    svg: SVGSVGElement | null;
    engine2dRenderFn: MutableRefObject<((moved: boolean, idleframe: boolean) => void) | undefined>;
    interactionPositions: MutableRefObject<(vec2 | undefined)[]>;
}) {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);
    const viewMode = useAppSelector(selectViewMode);
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const currentTopDownElevation = useAppSelector(selectCurrentTopDownElevation);

    const moveSvgMarkers = useMoveMarkers(svg);
    const moveSvgInteractions = useMove2DInteractions(svg, interactionPositions);

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

            view.render = (isIdleFrame) => cameraMoved(isIdleFrame, view);

            function cameraMoved(isIdleFrame: boolean, view: View) {
                const moved = view.activeController.moving || prevCameraType.current !== cameraType;
                prevCameraType.current = cameraType;

                engine2dRenderFn.current?.(moved, isIdleFrame);

                if (!moved) {
                    return;
                }

                moveSvgMarkers();
                moveSvgInteractions();
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
                    const kind =
                        view.renderState.camera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole;
                    const lastPos = savedCameraPositions.positions[savedCameraPositions.currentIndex];

                    if (
                        lastPos &&
                        vec3.equals(position, lastPos.position) &&
                        quat.equals(rotation, lastPos.rotation) &&
                        lastPos.fov &&
                        lastPos.fov === fov &&
                        kind === lastPos.kind
                    ) {
                        return;
                    }

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
        [
            view,
            dispatch,
            currentTopDownElevation,
            savedCameraPositions,
            cameraType,
            viewMode,
            moveSvgMarkers,
            moveSvgInteractions,
            engine2dRenderFn,
        ]
    );
}
