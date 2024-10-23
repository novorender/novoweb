import { useEffect } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectClassificationColorGradient, selectDefaultPointVisualization } from "../renderSlice";

export function useHandlePointVisualization() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const defaultPointVisualization = useAppSelector(selectDefaultPointVisualization);
    const classificationColorGradient = useAppSelector(selectClassificationColorGradient);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (defaultPointVisualization.kind === "classification") {
            view.modifyRenderState({
                highlights: {
                    defaultPointVisualization,
                },
                points: {
                    classificationColorGradient: {
                        knots: classificationColorGradient.knots.map(({ label: _label, ...knot }) => knot),
                    },
                    undefinedColor: classificationColorGradient.undefinedColor,
                },
            });
        } else if (defaultPointVisualization.kind === "elevation") {
            view.modifyRenderState({
                highlights: {
                    defaultPointVisualization,
                },
                // terrain.elevationGradient is set in useHandleTerrain
            });
        } else {
            view.modifyRenderState({
                highlights: {
                    defaultPointVisualization,
                },
            });
        }
    }, [view, classificationColorGradient, defaultPointVisualization]);
}
