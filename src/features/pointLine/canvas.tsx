import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawPart, getCameraState, getInteractionPositions, translateInteraction } from "features/engine2D";
import { Picker, selectPicker } from "features/render";

import { selectPointLineCurrentIdx, selectPointLines } from "./pointLineSlice";

export function PointLineCanvas({
    renderFnRef,
    svg,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

    const picker = useAppSelector(selectPicker);
    const pointLines = useAppSelector(selectPointLines);
    const currentIdx = useAppSelector(selectPointLineCurrentIdx);

    const moveInteractions = useCallback(() => {
        if (!view?.measure || !svg) {
            return;
        }

        const { remove, info, undo, finalize } = getInteractionPositions({
            view,
            points: pointLines,
            current: picker === Picker.PointLine ? currentIdx : -1,
        });

        pointLines.forEach((_, idx) => {
            translateInteraction(svg.children.namedItem(`removePl-${idx}`), remove[idx]);
            translateInteraction(svg.children.namedItem(`infoPl-${idx}`), info[idx]);
            translateInteraction(svg.children.namedItem(`undoPl-${idx}`), undo[idx]);

            const finalizePt = finalize[idx];
            if (finalizePt) {
                translateInteraction(svg.children.namedItem(`finalizePl-${idx}`), [finalizePt[0] - 10, finalizePt[1]]);
                translateInteraction(svg.children.namedItem(`connectPl-${idx}`), [finalizePt[0] + 15, finalizePt[1]]);
            } else {
                translateInteraction(svg.children.namedItem(`finalizePl-${idx}`));
                translateInteraction(svg.children.namedItem(`connectPl-${idx}`));
            }
        });
    }, [view, pointLines, svg, currentIdx, picker]);

    const draw = useCallback(() => {
        if (!view?.measure || !ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);
        pointLines.forEach((line) => {
            const pts = line.points;

            if (!pts.length) {
                return;
            }

            view.measure?.draw.getDrawObjectFromPoints(pts, false, true, true)?.objects.forEach((obj) =>
                obj.parts.forEach((part) =>
                    drawPart(
                        ctx,
                        cameraState,
                        part,
                        {
                            lineColor: "yellow",
                            pointColor: { start: "green", middle: "white", end: "blue" },
                            displayAllPoints: true,
                        },
                        2,
                        {
                            type: "default",
                        }
                    )
                )
            );
        });
    }, [view, pointLines, ctx, canvas]);

    useEffect(() => {
        draw();
    }, [draw, size]);

    useEffect(() => {
        moveInteractions();
    }, [moveInteractions, size]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);

        async function animate(moved: boolean): Promise<void> {
            if (!view || !moved) {
                return;
            }

            draw();
            moveInteractions();
        }
    }, [view, renderFnRef, draw, moveInteractions]);

    const canDraw = pointLines.some((ptLine) => ptLine.points.length > 0);
    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="point-line-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
        </>
    );
}
