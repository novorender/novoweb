import { ReadonlyVec2 } from "gl-matrix";
import { MutableRefObject, useCallback, useLayoutEffect } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { MeasureInteractionPositions } from "./measureInteractions";
import { selectMeasure } from "./measureSlice";

export function useMove2DInteractions(
    svg: SVGSVGElement | null,
    interactionPositions: MutableRefObject<MeasureInteractionPositions>
) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const { selectedEntities, duoMeasurementValues } = useAppSelector(selectMeasure);

    const move = useCallback(() => {
        if (!svg || !view?.measure) {
            return;
        }

        const translate = (id: string, pos?: ReadonlyVec2) => {
            const child = svg.children.namedItem(id);
            child?.setAttribute(
                "transform",
                pos ? `translate(${pos[0] - 100} ${pos[1] - 98})` : "translate(-1000 -1000)"
            );
        };

        for (let i = 0; i < selectedEntities.length; ++i) {
            translate(`removeMeasure-${i}`, interactionPositions.current.remove[i]);
            translate(`infoMeasure-${i}`, interactionPositions.current.info[i]);
        }
        for (let i = 0; i < duoMeasurementValues.length; ++i) {
            translate(
                `removeMeasureResultX-${i}`,
                i < interactionPositions.current.removeAxis.length
                    ? interactionPositions.current.removeAxis[i].x
                    : undefined
            );
            translate(
                `removeMeasureResultY-${i}`,
                i < interactionPositions.current.removeAxis.length
                    ? interactionPositions.current.removeAxis[i].y
                    : undefined
            );
            translate(
                `removeMeasureResultZ-${i}`,
                i < interactionPositions.current.removeAxis.length
                    ? interactionPositions.current.removeAxis[i].z
                    : undefined
            );
            translate(
                `removeMeasureResultDist-${i}`,
                i < interactionPositions.current.removeAxis.length
                    ? interactionPositions.current.removeAxis[i].dist
                    : undefined
            );
            translate(
                `removeMeasureResultPlan-${i}`,
                i < interactionPositions.current.removeAxis.length
                    ? interactionPositions.current.removeAxis[i].plan
                    : undefined
            );
            translate(
                `removeMeasureResultNormal-${i}`,
                i < interactionPositions.current.removeAxis.length
                    ? interactionPositions.current.removeAxis[i].normal
                    : undefined
            );
        }
    }, [view, svg, selectedEntities, interactionPositions, duoMeasurementValues]);

    useLayoutEffect(() => {
        move();
    }, [move]);

    return move;
}
