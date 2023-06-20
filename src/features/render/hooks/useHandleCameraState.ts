import { vec3, quat } from "gl-matrix";
import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { CameraType, selectCamera, selectCameraDefaults } from "..";
import { flip } from "../utils";

export function useHandleCameraState() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const state = useAppSelector(selectCamera);
    const defaults = useAppSelector(selectCameraDefaults);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (state.type === CameraType.Pinhole) {
            const pinholeKind = "flight"; // TODO
            const controller = view.controllers[pinholeKind];

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

            view.switchCameraController(pinholeKind);
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
    }, [view, state]);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (state.type === CameraType.Pinhole) {
            view.modifyRenderState({ camera: { ...defaults.pinhole.clipping } });
        } else {
            view.modifyRenderState({ camera: { ...defaults.orthographic.clipping } });
        }
    }, [state, defaults, view]);
}
