import { mat4, quat, vec3 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ViewMode } from "types/misc";

import { CameraType, renderActions, selectCamera, selectCameraDefaults, selectViewMode } from "..";

export function useHandleCameraState() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const state = useAppSelector(selectCamera);
    const defaults = useAppSelector(selectCameraDefaults);
    const viewMode = useAppSelector(selectViewMode);
    const dispatch = useAppDispatch();

    const pinholeKind = useRef<"flight" | "special" | "cadMiddlePan" | "cadRightPan" | "panorama">(
        defaults.pinhole.controller
    );

    useEffect(() => {
        if (!view) {
            return;
        }

        pinholeKind.current = viewMode === ViewMode.Panorama ? "panorama" : defaults.pinhole.controller;
    }, [view, viewMode, defaults.pinhole.controller, pinholeKind]);

    useEffect(() => {
        swapCamera();
        async function swapCamera() {
            if (!view) {
                return;
            }

            if (state.type === CameraType.Pinhole) {
                const controller = view.controllers[pinholeKind.current];
                view.switchCameraController(pinholeKind.current);

                if (state.goTo) {
                    controller.moveTo(
                        vec3.clone(state.goTo.position),
                        state.goTo.flyTime ?? 1000,
                        quat.clone(state.goTo.rotation)
                    );
                } else if (state.zoomTo) {
                    controller.zoomTo(state.zoomTo);
                }

                dispatch(renderActions.setGrid({ enabled: false }));
            } else {
                await view.switchCameraController(
                    "ortho",
                    state.goTo
                        ? {
                              position: vec3.clone(state.goTo.position),
                              rotation: quat.clone(state.goTo.rotation),
                              fov: state.goTo.fov,
                          }
                        : undefined
                );

                const mat = mat4.fromQuat(mat4.create(), state.goTo?.rotation ?? view.renderState.camera.rotation);
                const right = vec3.fromValues(mat[0], mat[1], mat[2]);
                const up = vec3.fromValues(mat[4], mat[5], mat[6]);

                dispatch(
                    renderActions.setGrid({
                        origin: state.gridOrigo ?? state.goTo?.position,
                        axisY: up,
                        axisX: right,
                    })
                );
            }
        }
    }, [view, dispatch, state]);

    useEffect(() => {
        if (!view) {
            return;
        }

        const clipping = {
            ...(state.goTo?.near ? { near: state.goTo.near } : {}),
            ...(state.goTo?.far ? { far: state.goTo.far } : {}),
        };

        if (state.type === CameraType.Pinhole) {
            view.modifyRenderState({
                points: { useProjectedPosition: false },
                camera: { ...defaults.pinhole.clipping, ...clipping },
            });
        } else {
            view.modifyRenderState({
                points: { useProjectedPosition: view.isTopDown() },
                camera: { ...defaults.orthographic.clipping, ...clipping },
            });
        }
    }, [state, defaults.pinhole.clipping, defaults.orthographic.clipping, view]);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.controllers["ortho"].updateParams({
            usePointerLock: defaults.orthographic.usePointerLock,
            touchDeAcceleration: defaults.orthographic.touchDeAcceleration,
            touchRotate: defaults.orthographic.touchRotate,
        });
    }, [
        view,
        defaults.orthographic.usePointerLock,
        defaults.orthographic.touchDeAcceleration,
        defaults.orthographic.touchRotate,
    ]);
}
