import { DrawProduct } from "@novorender/api";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app/store";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart, getCameraState } from "features/engine2D";

import { getMeasurePointsFromTracer, selectOutlineLasers } from "./outlineLaserSlice";

export function OutlineLaserCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const outlineLasers = useAppSelector(selectOutlineLasers);

    const draw = useCallback(() => {
        if (!view || !ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const camera = getCameraState(view.renderState.camera);
        outlineLasers.forEach((laser) => {
            const { left, right, up, down, measurementX: x, measurementY: y } = laser;
            const xPts = x && getMeasurePointsFromTracer(x, left, right);
            const yPts = y && getMeasurePointsFromTracer(y, down, up);

            if (xPts) {
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(xPts, false, false, true, 2);
                if (drawProd) {
                    renderTrace({ ctx, camera, drawProd, color: "blue" });
                }
            }

            if (yPts) {
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(yPts, false, false, true, 2);
                if (drawProd) {
                    renderTrace({ ctx, camera, drawProd, color: "green" });
                }
            }
        });
    }, [ctx, canvas, view, outlineLasers]);

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
