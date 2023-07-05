import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectGrid } from "features/render";

export function useHandleGrid() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const grid = useAppSelector(selectGrid);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.modifyRenderState({ grid });
    }, [view, grid]);
}