import { vec3, quat } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ViewMode } from "types/misc";

import { CameraType, selectCamera, selectCameraDefaults, selectViewMode } from "..";
import { flip } from "../utils";

export function useHandleCameraState() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const state = useAppSelector(selectCamera);
    const defaults = useAppSelector(selectCameraDefaults);
    const viewMode = useAppSelector(selectViewMode);
    const dispatch = useAppDispatch();

    const pinholeKind = useRef<"flight" | "cad" | "panorama">(defaults.pinhole.controller);

    useEffect(() => {
        if (!view) {
            return;
        }

        pinholeKind.current = viewMode === ViewMode.Panorama ? "panorama" : defaults.pinhole.controller;
        view.switchCameraController(pinholeKind.current);
    }, [view, viewMode, defaults.pinhole.controller, pinholeKind]);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (state.type === CameraType.Pinhole) {
            const controller = view.controllers[pinholeKind.current];

            if (state.goTo) {
                // controller.moveTo({
                //     position: vec3.clone(state.goTo.position),
                //     rotation: quat.clone(state.goTo.rotation),
                // });
                controller.moveTo(vec3.clone(state.goTo.position), 1000, quat.clone(state.goTo.rotation));
            } else if (state.zoomTo) {
                controller.zoomTo({
                    center: flip(state.zoomTo.center),
                    radius: state.zoomTo.radius,
                });
            }

            view.switchCameraController(controller.kind);
        } else {
            // const controller = view.controllers["ortho"];

            if (state.goTo) {
                // view.switchCameraController("ortho");
                // controller.moveTo(vec3.clone(state.goTo.position), 1000, quat.clone(state.goTo.rotation));
                // controller.updateParams({ fieldOfView: state.goTo.fov });
                view.switchCameraController("ortho", {
                    position: vec3.clone(state.goTo.position),
                    rotation: quat.clone(state.goTo.rotation),
                    fov: state.goTo.fov,
                });
            }
        }
    }, [view, dispatch, state]);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (state.type === CameraType.Pinhole) {
            view.modifyRenderState({ camera: { ...defaults.pinhole.clipping } });
        } else {
            view.modifyRenderState({ camera: { ...defaults.orthographic.clipping } });
        }
    }, [state, defaults.pinhole.clipping, defaults.orthographic.clipping, view]);

    useEffect(() => {
        if (!view) {
            return;
        }

        // Todo pointerlock
        // view.controllers["ortho"].input.usePointerLock = defaults.orthographic.usePointerLock;
    }, [view, defaults.orthographic.usePointerLock]);
}
