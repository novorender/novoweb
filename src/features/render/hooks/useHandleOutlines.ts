import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ViewMode } from "types/misc";

import { selectViewMode } from "..";

export function useHandleOutlines() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const viewMode = useAppSelector(selectViewMode);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.modifyRenderState({ outlines: { enabled: viewMode === ViewMode.FollowPath } });
    }, [view, viewMode]);
}
