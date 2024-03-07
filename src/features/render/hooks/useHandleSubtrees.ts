import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ViewMode } from "types/misc";

import { selectSubtrees, selectViewMode } from "../renderSlice";
import { SubtreeStatus } from "../types";

export function useHandleSubtrees() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const subtrees = useAppSelector(selectSubtrees);
    const viewMode = useAppSelector(selectViewMode);

    useEffect(
        function handleSubtreeChanges() {
            if (!view) {
                return;
            }

            if (viewMode === ViewMode.Panorama) {
                view.modifyRenderState({
                    scene: {
                        hide: {
                            triangles: true,
                            documents: true,
                            points: true,
                            terrain: true,
                            lines: true,
                        },
                    },
                });

                return;
            }

            view.modifyRenderState({
                scene: {
                    hide: {
                        triangles: subtrees.triangles !== SubtreeStatus.Shown,
                        documents: subtrees.documents !== SubtreeStatus.Shown,
                        points: subtrees.points !== SubtreeStatus.Shown,
                        terrain: subtrees.terrain !== SubtreeStatus.Shown,
                        lines: subtrees.lines !== SubtreeStatus.Shown,
                    },
                },
            });
        },
        [subtrees, view, viewMode]
    );
}
