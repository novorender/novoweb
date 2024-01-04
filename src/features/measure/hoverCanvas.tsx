import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import * as engine2D from "features/engine2D";
import { Picker, selectPicker } from "features/render";

import { selectHoveredMeasureEntity } from "./measureSlice";

const fillColor = "rgba(0, 170, 200, 0.3)";
const lineColor = "rgba(255, 165, 0, 1)";

export function HoverCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const hoveredEntity = useAppSelector(selectHoveredMeasureEntity);
    const picker = useAppSelector(selectPicker);

    const drawId = useRef(0);
    const draw = useCallback(async () => {
        if (!view?.measure || !ctx || !canvas) {
            return;
        }

        const id = ++drawId.current;
        const drawEntity = hoveredEntity ? await view.measure?.draw.getDrawEntity(hoveredEntity) : undefined;

        if (id !== drawId.current) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!drawEntity) {
            return;
        }

        const cameraState = engine2D.getCameraState(view.renderState.camera);
        engine2D.drawProduct(
            ctx,
            cameraState,
            drawEntity,
            { lineColor: lineColor, fillColor: fillColor, pointColor: lineColor },
            5
        );
    }, [view, ctx, canvas, hoveredEntity]);

    useEffect(() => {
        draw();
    }, [draw, size]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);

        async function animate(moved: boolean): Promise<void> {
            if (!view || !moved) {
                return;
            }

            draw();
        }
    }, [view, renderFnRef, draw]);

    const canDraw = hoveredEntity && [Picker.Area, Picker.Measurement, Picker.PointLine].includes(picker);
    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="hover-canvas"
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
