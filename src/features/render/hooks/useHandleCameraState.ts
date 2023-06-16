import { vec3, quat } from "gl-matrix";
import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { CameraType, selectCamera } from "..";
import { flip } from "../utils";

export function useHandleCameraState() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const state = useAppSelector(selectCamera);

    useEffect(() => {
        if (!view) {
            return;
        }

        switch (state.type) {
            case CameraType.Pinhole: {
                const pinholeKind = "flight"; // TODO
                const controller = view.controllers[pinholeKind];

                if (state.goTo) {
                    // controller.moveTo({
                    //     position: vec3.clone(state.goTo.position),
                    //     rotation: quat.clone(state.goTo.rotation),
                    // });
                    controller.moveTo(vec3.clone(state.goTo.position), 0, quat.clone(state.goTo.rotation));
                } else if (state.zoomTo) {
                    controller.zoomTo({
                        center: flip(state.zoomTo.center),
                        radius: state.zoomTo.radius,
                    });
                }

                view.switchCameraController(pinholeKind);
                break;
            }
            case CameraType.Orthographic: {
                // const controller = view.controllers["ortho"];

                if (state.goTo) {
                    // view.switchCameraController("ortho");
                    // controller.moveTo(vec3.clone(state.goTo.position), 2000, quat.clone(state.goTo.rotation));
                    view.switchCameraController("ortho", {
                        position: vec3.clone(state.goTo.position),
                        rotation: quat.clone(state.goTo.rotation),
                    });
                }

                break;
            }
            default:
                return;
        }
    }, [view, state]);
}
