import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectDeviations } from "features/render";
import { AsyncStatus, hasFinished } from "types/misc";

import { selectDeviationProfiles } from "./deviationsSlice";

export function useHandleDeviations() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const deviation = useAppSelector(selectDeviations);
    const profiles = useAppSelector(selectDeviationProfiles);

    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            view.modifyRenderState({
                points: {
                    deviation:
                        hasFinished(profiles) && profiles.status !== AsyncStatus.Error && profiles.data.length < 2
                            ? { ...deviation, index: 0 }
                            : deviation,
                },
            });
        },
        [view, deviation, profiles]
    );
}
