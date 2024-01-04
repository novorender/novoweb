import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawProduct, getCameraState, measurementFillColor } from "features/engine2D";

import { useHeightProfileMeasureObject } from "./useHeightProfileMeasureObject";

export function HeightProfileCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setSelectedEntityCtx] = useState<CanvasRenderingContext2D | null>(null);
    const selectedEntity = useHeightProfileMeasureObject();

    const drawId = useRef(0);
    const draw = useCallback(async () => {
        if (!view || !ctx || !canvas) {
            return;
        }

        const id = ++drawId.current;
        const drawEntity = selectedEntity ? await view.measure?.draw.getDrawEntity(selectedEntity) : undefined;

        if (id !== drawId.current) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!drawEntity) {
            return;
        }

        const cameraState = getCameraState(view.renderState.camera);
        drawProduct(ctx, cameraState, drawEntity, { lineColor: "yellow", fillColor: measurementFillColor }, 3);
    }, [canvas, selectedEntity, ctx, view]);

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

    const canDraw = selectedEntity !== undefined;
    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="height-profile-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setSelectedEntityCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
        </>
    );
}
