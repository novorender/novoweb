import { ReadonlyVec2, vec2 } from "gl-matrix";
import { MutableRefObject, useCallback, useLayoutEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectMeasure } from "features/measure";
import { GetMeasurePointsFromTracer, selectOutlineLasers } from "features/outlineLaser";

export function useMove2DInteractions(
    svg: SVGSVGElement | null,
    interactionPositions: MutableRefObject<(vec2 | undefined)[]>
) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const outlineLasers = useAppSelector(selectOutlineLasers);
    const { selectedEntities } = useAppSelector(selectMeasure);

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
            translate(`removeMeasure-${i}`, interactionPositions.current[i]);
        }
    }, [view, svg, outlineLasers, selectedEntities, interactionPositions]);

    useLayoutEffect(() => {
        move();
    }, [move]);

    return move;
}
