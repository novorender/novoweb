import { useEffect } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppSelector } from "app/store";

import { selectCameraSpeedLevels, selectCurrentCameraSpeedLevel, selectProportionalCameraSpeed } from "..";
import { FlightController } from "@novorender/api";

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
                if (FlightController.is(controller)) {
                    controller.updateParams({
                        linearVelocity: levels[currentLevel],
                        rotationalVelocity: levels[currentLevel],
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
