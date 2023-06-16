import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectTerrain } from "..";

export function useHandleTerrain() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const terrain = useAppSelector(selectTerrain);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.modifyRenderState({
            terrain: {
                asBackground: terrain.asBackground,
                elevationGradient: terrain.elevationGradient,
            },
        });
    }, [view, terrain]);
}
