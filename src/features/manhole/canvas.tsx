import { vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawPart, drawProduct, getCameraState, measurementFillColor } from "features/engine2D";

import { selectManholeCollisionTarget, selectManholeCollisionValues, selectManholeMeasureValues } from "./manholeSlice";

export function ManholeCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

    const manhole = useAppSelector(selectManholeMeasureValues);
    const manholeCollisionValues = useAppSelector(selectManholeCollisionValues);
    const manholeCollisionEntity = useAppSelector(selectManholeCollisionTarget)?.entity;

    const updateId = useRef(0);

    const draw = useCallback(async () => {
        if (!view?.measure || !ctx || !canvas) {
            return;
        }

        const id = ++updateId.current;
        const [manholeDrawObject, manholeCollisionEntityDrawObject] = await Promise.all([
            manhole ? await view.measure.draw.getDrawEntity(manhole) : undefined,
            manholeCollisionEntity ? await view.measure.draw.getDrawEntity(manholeCollisionEntity) : undefined,
        ]);

        if (id !== updateId.current) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);
        if (manholeDrawObject) {
            drawProduct(
                ctx,
                cameraState,
                manholeDrawObject,
                { lineColor: "yellow", fillColor: measurementFillColor },
                3,
            );
        }

        if (manholeCollisionEntityDrawObject) {
            drawProduct(
                ctx,
                cameraState,
                manholeCollisionEntityDrawObject,
                { lineColor: "yellow", fillColor: measurementFillColor },
                3,
            );
        }

        if (manholeCollisionValues && (manholeCollisionValues.outer || manholeCollisionValues.inner)) {
            view.measure?.draw
                .getDrawObjectFromPoints(manholeCollisionValues.lid, { closed: false, angles: true })
                ?.objects.forEach((obj) =>
                    obj.parts.forEach((part) =>
                        drawPart(
                            ctx,
                            cameraState,
                            part,
                            {
                                lineColor: "#55802b",
                                pointColor: "black",
                                displayAllPoints: true,
                            },
                            2,
                            {
                                type: "centerOfLine",
                                customText: [
                                    vec3
                                        .len(
                                            vec3.sub(
                                                vec3.create(),
                                                manholeCollisionValues.lid[0],
                                                manholeCollisionValues.lid[1],
                                            ),
                                        )
                                        .toFixed(2),
                                ],
                            },
                        ),
                    ),
                );
        }
    }, [view, ctx, canvas, manhole, manholeCollisionEntity, manholeCollisionValues]);

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

    const canDraw = Boolean(manhole || manholeCollisionEntity || manholeCollisionValues);
    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="manhole-canvas"
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
