import { useEffect } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectGrid } from "../renderSlice";

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
