import { ReadonlyVec2, vec2 } from "gl-matrix";
import { MutableRefObject, useCallback, useLayoutEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectAreas } from "features/area";
import { selectMeasure } from "features/measure";
import { MeasureInteractionPositions } from "features/measure/measureInteractions";
import { GetMeasurePointsFromTracer, selectOutlineLasers } from "features/outlineLaser";
import { selectPointLines } from "features/pointLine";

export function useMove2DInteractions(
    svg: SVGSVGElement | null,
    interactionPositions: MutableRefObject<MeasureInteractionPositions>
) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const outlineLasers = useAppSelector(selectOutlineLasers);
    const { selectedEntities, duoMeasurementValues } = useAppSelector(selectMeasure);
    const areas = useAppSelector(selectAreas);
    const pointLines = useAppSelector(selectPointLines);

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

        for (let i = 0; i < outlineLasers.length; ++i) {
            const translateAction = (id: string, a?: ReadonlyVec2, b?: ReadonlyVec2) => {
                let pos: ReadonlyVec2 | undefined = undefined;
                if (a && b) {
                    const dir = vec2.sub(vec2.create(), b, a);
                    const l = vec2.len(dir);
                    if (l > 150) {
                        const t = (l / 2 + 50) / l;
                        pos = vec2.scaleAndAdd(vec2.create(), a, dir, t);
                    }
                }
                svg.children
                    .namedItem(id)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 100} ${pos[1] - 100})` : "translate(-100 -100)"
                    );
            };

            const trace = outlineLasers[i];
            const { left, right, up, down, measurementX: x, measurementY: y } = trace;
            if (x) {
                const tracePts = GetMeasurePointsFromTracer(x, left, right);
                if (tracePts) {
                    const [l, r] = view.measure.draw.toMarkerPoints(tracePts);
                    translate(`leftMarker-${i}`, l);
                    translate(`rightMarker-${i}`, r);
                    trace.measurementX?.start
                        ? translateAction(`updateXTracer-${i}`, l, r)
                        : translateAction(`removeXTracer-${i}`, l, r);
                }
            }
            if (y) {
                const tracePts = GetMeasurePointsFromTracer(y, down, up);
                if (tracePts) {
                    const [d, u] = view.measure.draw.toMarkerPoints(tracePts);
                    translate(`downMarker-${i}`, d);
                    translate(`upMarker-${i}`, u);
                    trace.measurementY?.start
                        ? translateAction(`updateYTracer-${i}`, d, u)
                        : translateAction(`removeYTracer-${i}`, d, u);
                }
            }
        }
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
            for (let i = 0; i < areas.length; ++i) {
                translate(`removeArea-${i}`, interactionPositions.current.area.remove[i]);
                translate(`finalizeArea-${i}`, interactionPositions.current.area.finalize[i]);
                translate(`undoArea-${i}`, interactionPositions.current.area.undo[i]);
            }
            for (let i = 0; i < pointLines.length; ++i) {
                translate(`removePl-${i}`, interactionPositions.current.pointLine.remove[i]);
                translate(`finalizePl-${i}`, interactionPositions.current.pointLine.finalize[i]);
                translate(`undoPl-${i}`, interactionPositions.current.pointLine.undo[i]);
            }
        }
    }, [view, svg, outlineLasers, selectedEntities, interactionPositions, duoMeasurementValues, areas, pointLines]);

    useLayoutEffect(() => {
        move();
    }, [move]);

    return move;
}
