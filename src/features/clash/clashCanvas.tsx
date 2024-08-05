import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawPart, getCameraState } from "features/engine2D";

import { selectSelectedClash } from "./selectors";

export default function ClashCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const clash = useAppSelector(selectSelectedClash);

    const draw = useCallback(() => {
        if (!view?.measure || !ctx || !canvas || !clash) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);

        view.measure.draw.getDrawObjectFromPoints([clash.clashPoint])?.objects.forEach((obj) => {
            obj.parts.forEach((part) => {
                drawPart(
                    ctx,
                    cameraState,
                    part,
                    {
                        pointColor: "yellow",
                    },
                    4
                );
            });
        });
    }, [view, ctx, canvas, clash]);

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

    const canDraw = view && clash;

    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="clash-canvas"
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
