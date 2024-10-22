import { glMatrix, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLastPickSample } from "contexts/lastPickSample";
import { drawPart, getCameraState } from "features/engine2D";
import { Picker, selectPicker } from "features/render";

export function OutlineLaserGizmoCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);
    const lastPickSample = useLastPickSample();
    const isOutlineLaserPicker = useAppSelector(selectPicker) === Picker.OutlineLaser;
    const dirty = useRef(false);

    const draw = useCallback(() => {
        if (!view?.measure || !ctx || !canvas) {
            return;
        }

        if (dirty.current) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (!lastPickSample) {
            return;
        }

        const normal = lastPickSample.normal;

        const pos = lastPickSample.position;
        let z0 = pos;
        let z1 = vec3.add(vec3.create(), pos, normal);
        const up = glMatrix.equals(Math.abs(vec3.dot(vec3.fromValues(0, 0, 1), normal)), 1)
            ? vec3.fromValues(0, 1, 0)
            : vec3.fromValues(0, 0, 1);
        const xDir = vec3.cross(vec3.create(), normal, up);
        vec3.normalize(xDir, xDir);
        let x0 = vec3.add(vec3.create(), pos, xDir);
        let x1 = vec3.scaleAndAdd(vec3.create(), pos, xDir, -1);
        const yDir = vec3.cross(vec3.create(), normal, xDir);
        vec3.normalize(yDir, yDir);
        let y0 = vec3.add(vec3.create(), pos, yDir);
        let y1 = vec3.scaleAndAdd(vec3.create(), pos, yDir, -1);

        const outlineIntersection = view.screenSpaceLaser(lastPickSample.position, xDir, yDir, normal);
        let foundX = false;
        let foundY = false;
        let foundZ = false;

        if (outlineIntersection) {
            const l0 = outlineIntersection.left?.[0];
            const r0 = outlineIntersection.right?.[0];
            if (l0 && r0) {
                x0 = l0;
                x1 = r0;
                foundX = true;
            }

            const u0 = outlineIntersection.up?.[0];
            const d0 = outlineIntersection.down?.[0];
            if (u0 && d0) {
                y0 = u0;
                y1 = d0;
                foundY = true;
            }

            const zu0 = outlineIntersection.zUp?.[0];
            const zd0 = outlineIntersection.zDown?.[0];
            if (zu0 && zd0) {
                z0 = zu0;
                z1 = zd0;
                foundZ = true;
            }
        }

        ctx.lineWidth = 3;
        const camera = getCameraState(view.renderState.camera);
        for (const [p1, p2, found, color] of [
            [x0, x1, foundX, "#8BC34A"],
            [y0, y1, foundY, "#03A9F4"],
            [z0, z1, foundZ, "#F44336"],
        ] as const) {
            const drawProduct = view.measure?.draw.getDrawObjectFromPoints([p1, p2], {
                closed: false,
                angles: false,
                generateLineLabels: true,
                decimals: 2,
            });
            for (const obj of drawProduct?.objects || []) {
                for (const part of obj.parts) {
                    dirty.current = true;
                    drawPart(
                        ctx,
                        camera,
                        part,
                        { lineColor: color },
                        2,
                        found ? { type: "center", unit: "m" } : undefined,
                    );
                }
            }
        }
    }, [ctx, canvas, view, lastPickSample]);

    useEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);
        function animate(moved: boolean) {
            if (view && moved) {
                draw();
            }
        }
    }, [draw, renderFnRef, view]);

    return isOutlineLaserPicker ? (
        <Canvas2D
            id="outline-laser-gizmo-canvas"
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
