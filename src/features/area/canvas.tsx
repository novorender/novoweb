import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawPart, getCameraState, getInteractionPositions, translateInteraction } from "features/engine2D";
import { measurementFillColor } from "features/engine2D";
import { Picker, selectPicker } from "features/render";

import { selectAreas, selectCurrentAreaIndex } from "./areaSlice";

export function AreaCanvas({
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
    const areas = useAppSelector(selectAreas);
    const currentAreaIndex = useAppSelector(selectCurrentAreaIndex);

    const moveInteractions = useCallback(() => {
        if (!view?.measure || !svg) {
            return;
        }

        const { remove, info, undo, finalize } = getInteractionPositions({
            view,
            points: areas,
            current: picker === Picker.Area ? currentAreaIndex : -1,
        });
        areas.forEach((_, idx) => {
            translateInteraction(svg.children.namedItem(`removeArea-${idx}`), remove[idx]);
            translateInteraction(svg.children.namedItem(`infoArea-${idx}`), info[idx]);
            translateInteraction(svg.children.namedItem(`finalizeArea-${idx}`), finalize[idx]);
            translateInteraction(svg.children.namedItem(`undoArea-${idx}`), undo[idx]);
        });
    }, [view, areas, svg, currentAreaIndex, picker]);

    const draw = useCallback(() => {
        if (!view?.measure || !ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);
        areas.forEach((area) => {
            const pts = area.drawPoints;

            if (!pts.length) {
                return;
            }

            view.measure?.draw.getDrawObjectFromPoints(pts, true, true)?.objects.forEach((obj) =>
                obj.parts.forEach((part) =>
                    drawPart(
                        ctx,
                        cameraState,
                        part,
                        {
                            lineColor: "yellow",
                            fillColor: measurementFillColor,
                            pointColor: { start: "green", middle: "white", end: "blue" },
                            displayAllPoints: true,
                        },
                        2,
                        {
                            type: "center",
                            unit: "m²",
                            customText: [area.area.toFixed(2)],
                        }
                    )
                )
            );
        });
    }, [view, areas, ctx, canvas]);

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

    const canDraw = areas.some((area) => area.points.length > 0);
    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="area-canvas"
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
