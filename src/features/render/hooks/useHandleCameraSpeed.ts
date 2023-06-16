import { useEffect } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppSelector } from "app/store";

import { selectCameraSpeedLevels, selectCurrentCameraSpeedLevel, selectProportionalCameraSpeed } from "..";

export function useHandleCameraSpeed() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const levels = useAppSelector(selectCameraSpeedLevels).flight;
    const currentLevel = useAppSelector(selectCurrentCameraSpeedLevel);
    const proportionalSpeed = useAppSelector(selectProportionalCameraSpeed);

    useEffect(
        function handleCameraSpeedChanges() {
            if (!view) {
                return;
            }

            Object.values(view.controllers).forEach((controller) => {
                controller.updateParams({
                    linearVelocity: levels[currentLevel],
                    proportionalCameraSpeed: proportionalSpeed.enabled
                        ? {
                              min: proportionalSpeed.min,
                              max: proportionalSpeed.max,
                          }
                        : undefined,
                });
            });
        },
        [levels, currentLevel, proportionalSpeed, view]
    );
}
