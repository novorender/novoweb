import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectGrid } from "slices/renderSlice";

export function useHandleGridChanges() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const grid = useAppSelector(selectGrid);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.applySettings({ grid });
    }, [view, grid]);
}
