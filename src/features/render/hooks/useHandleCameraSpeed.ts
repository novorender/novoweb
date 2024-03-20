import { useEffect } from "react";

import { useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectCameraSpeedLevels, selectCurrentCameraSpeedLevel, selectProportionalCameraSpeed } from "../renderSlice";

export function useHandleCameraSpeed() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const levels = useAppSelector(selectCameraSpeedLevels);
    const currentLevel = useAppSelector(selectCurrentCameraSpeedLevel);
    const proportionalSpeed = useAppSelector(selectProportionalCameraSpeed);

    useEffect(
        function handleCameraSpeedChanges() {
            if (!view) {
                return;
            }

            Object.values(view.controllers).forEach((controller) => {
                if ("updateParams" in controller) {
                    controller.updateParams({
                        linearVelocity: levels[currentLevel],
                        rotationalVelocity: 1,
                        proportionalCameraSpeed: proportionalSpeed.enabled
                            ? {
                                  min: proportionalSpeed.min,
                                  max: proportionalSpeed.max,
                              }
                            : undefined,
                    });
                }
            });
        },
        [levels, currentLevel, proportionalSpeed, view]
    );
}
