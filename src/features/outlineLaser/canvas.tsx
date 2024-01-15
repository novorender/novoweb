import { DrawProduct } from "@novorender/api";
import { vec2 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app/store";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart, getCameraState, translateInteraction } from "features/engine2D";

import { getMeasurePointsFromTracer, selectOutlineLasers } from "./outlineLaserSlice";

export function OutlineLaserCanvas({
    renderFnRef,
    svg,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const outlineLasers = useAppSelector(selectOutlineLasers);

    const draw = useCallback(() => {
        if (!view || !ctx || !canvas || !svg) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const camera = getCameraState(view.renderState.camera);
        outlineLasers.forEach((laser, i) => {
            const { left, right, up, down, measurementX: x, measurementY: y } = laser;
            const xPts = x && getMeasurePointsFromTracer(x, left, right);
            const yPts = y && getMeasurePointsFromTracer(y, down, up);

            if (xPts) {
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(xPts, false, false, true, 2);
                if (drawProd) {
                    renderTrace({ ctx, camera, drawProd, color: "blue" });
                }

                const [l, r] = view.measure?.draw.toMarkerPoints(xPts) ?? [];
                translateInteraction(svg.children.namedItem(`leftMarker-${i}`), l);
                translateInteraction(svg.children.namedItem(`rightMarker-${i}`), r);

                laser.measurementX?.start
                    ? translateInteraction(svg.children.namedItem(`updateXTracer-${i}`), getActionPos(l, r))
                    : translateInteraction(svg.children.namedItem(`removeXTracer-${i}`), getActionPos(l, r));
            }

            if (yPts) {
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(yPts, false, false, true, 2);
                if (drawProd) {
                    renderTrace({ ctx, camera, drawProd, color: "green" });
                }

                const [d, u] = view.measure?.draw.toMarkerPoints(yPts) ?? [];
                translateInteraction(svg.children.namedItem(`downMarker-${i}`), d);
                translateInteraction(svg.children.namedItem(`upMarker-${i}`), u);
                laser.measurementY?.start
                    ? translateInteraction(svg.children.namedItem(`updateYTracer-${i}`), getActionPos(d, u))
                    : translateInteraction(svg.children.namedItem(`removeYTracer-${i}`), getActionPos(d, u));
            }
        });
    }, [ctx, canvas, view, outlineLasers, svg]);

    useEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);
        function animate(moved: boolean) {
            if (!view || !moved) {
                return;
            }
            draw();
        }
    }, [draw, renderFnRef, view]);

    return outlineLasers.length ? (
        <Canvas2D
            id="outline-laser-canvas"
            data-include-snapshot
            ref={(el) => {
                setCanvas(el);
                setCtx(el?.getContext("2d") ?? null);
            }}
            width={size.width}
            height={size.height}
        />
    ) : null;
}

function getActionPos(a?: Vec2, b?: Vec2): Vec2 | undefined {
    if (!a || !b) {
        return;
    }

    const dir = vec2.sub(vec2.create(), b, a);
    const l = vec2.len(dir);

    if (l < 150) {
        return;
    }

    const t = (l / 2 + 50) / l;
    return vec2.scaleAndAdd(vec2.create(), a, dir, t);
}

const renderTrace = ({
    ctx,
    camera,
    drawProd,
    color,
}: {
    ctx: CanvasRenderingContext2D;
    camera: CameraState;
    drawProd: DrawProduct;
    color: string;
}) => {
    drawProd.objects.forEach((obj) =>
        obj.parts.forEach((part) =>
            drawPart(
                ctx,
                camera,
                part,
                {
                    lineColor: color,
                },
                2,
                {
                    type: "default",
                }
            )
        )
    );
};
