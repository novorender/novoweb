import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectDeviations } from "features/render";

export function useHandleDeviations() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const deviation = useAppSelector(selectDeviations);

    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            view.modifyRenderState({ points: { deviation } });
        },
        [view, deviation]
    );
}
