import { vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawPart, drawTexts, getCameraState } from "features/engine2D";
import { CameraType, selectCameraType, selectGrid } from "features/render";

import { selectCrossSectionPoints } from "./orthoCamSlice";

export function CrossSectionCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [crossSectionCtx, setCrossSectionCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [gridCtx, setGridCtx] = useState<CanvasRenderingContext2D | null>(null);
    const crossSection = useAppSelector(selectCrossSectionPoints);
    const grid = useAppSelector(selectGrid);
    const cameraType = useAppSelector(selectCameraType);

    const drawCrossSection = useCallback(() => {
        if (!view?.measure || !crossSectionCtx || !canvas) {
            return;
        }

        crossSectionCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (!crossSection?.length) {
            return;
        }

        const cameraState = getCameraState(view.renderState.camera);

        view.measure?.draw.getDrawObjectFromPoints(crossSection, false, false)?.objects.forEach((obj) =>
            obj.parts.forEach((part) =>
                drawPart(
                    crossSectionCtx,
                    cameraState,
                    part,
                    {
                        lineColor: "black",
                        pointColor: "black",
                        displayAllPoints: true,
                    },
                    2
                )
            )
        );

        if (crossSection.length > 1 && cameraState.dir[2] === -1) {
            // top-down
            // draw arrow
            const up = vec3.fromValues(0, 0, 1);
            const dir = vec3.sub(vec3.create(), crossSection[1], crossSection[0]);
            vec3.normalize(dir, dir);
            const cross = vec3.cross(vec3.create(), dir, up);
            vec3.normalize(cross, cross);
            const center = vec3.add(vec3.create(), crossSection[0], crossSection[1]);
            vec3.scale(center, center, 0.5);
            const offsetP = vec3.scaleAndAdd(vec3.create(), center, cross, -3);
            view.measure?.draw.getDrawObjectFromPoints([center, offsetP], false, false)?.objects.forEach((obj) =>
                obj.parts.forEach((part) =>
                    drawPart(
                        crossSectionCtx,
                        cameraState,
                        part,
                        {
                            lineColor: "black",
                            pointColor: "black",
                        },
                        2,
                        undefined,
                        { end: "arrow" }
                    )
                )
            );
        }
    }, [view, crossSectionCtx, canvas, crossSection]);

    const drawGridLabels = useCallback(() => {
        if (!view || !gridCtx || !canvas) {
            return;
        }

        gridCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (view.renderState.camera.fov > 35) {
            return;
        }

        const xLen = vec3.len(grid.axisX);
        const yLen = vec3.len(grid.axisY);
        const pts3d: vec3[] = [];
        const labels: string[] = [];
        const numLabels = 10;
        for (let i = 0; i < numLabels; ++i) {
            const xLabel = (xLen * i * grid.size2).toFixed(1);
            const yLabel = (yLen * i * grid.size2).toFixed(1);
            pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origin, grid.axisX, i * grid.size2));
            labels.push(xLabel);
            if (i === 0) {
                continue;
            }

            pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origin, grid.axisX, -i * grid.size2));
            labels.push(`-${xLabel}`);

            pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origin, grid.axisY, i * grid.size2));
            labels.push(yLabel);
            pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origin, grid.axisY, -i * grid.size2));
            labels.push(`-${yLabel}`);
        }
        const pts = view.measure?.draw.toScreenSpace(pts3d);

        if (pts) {
            drawTexts(gridCtx, pts.screenPoints, labels);
        }
    }, [grid, gridCtx, view, canvas]);

    useEffect(() => {
        drawCrossSection();
    }, [drawCrossSection, size]);

    useEffect(() => {
        drawGridLabels();
    }, [drawGridLabels, size]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);

        async function animate(moved: boolean): Promise<void> {
            if (!view || !moved) {
                return;
            }

            drawCrossSection();
            drawGridLabels();
        }
    }, [view, renderFnRef, drawCrossSection, drawGridLabels]);

    const canDrawCrossSection = cameraType === CameraType.Orthographic && crossSection && crossSection.length > 0;
    const canDrawGridLabels = cameraType === CameraType.Orthographic && grid.enabled;
    return (
        <>
            {canDrawCrossSection && (
                <Canvas2D
                    id="ortho-cross-section-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setCrossSectionCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
            {canDrawGridLabels && (
                <Canvas2D
                    id="grid-labels-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setGridCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
        </>
    );
}
