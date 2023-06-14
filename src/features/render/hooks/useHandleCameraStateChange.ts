import { useEffect } from "react";

import { useAppSelector } from "app/store";

import { CameraType, selectCamera } from "..";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { vec3, quat } from "gl-matrix";

export function useHandleCameraStateChange() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const state = useAppSelector(selectCamera);

    useEffect(() => {
        if (!view) {
            return;
        }

        switch (state.type) {
            case CameraType.Flight: {
                const controller = view.controllers["flight"];

                if (state.goTo) {
                    controller.moveTo({
                        position: vec3.clone(state.goTo.position),
                        rotation: quat.clone(state.goTo.rotation),
                        // TODO reset after api bugfix
                        flyTime: 0,
                    });
                }
                break;
            }
            case CameraType.Orthographic: {
                break;
            }
            default:
                return;
        }
    }, [view, state]);
}
