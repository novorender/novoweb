import { css, styled } from "@mui/material";
import { DeviationProjection } from "@novorender/api";
import { vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectCurrentCenter, selectFollowDeviations, selectProfile } from "features/followPath";
import { CameraType, selectCameraType, selectGrid, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";
import { vecToHex } from "utils/color";

import { drawLineStrip, drawPoint, drawTexts } from "./utils";

const Canvas2D = styled("canvas")(
    () => css`
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    `
);

export function UtilDraw({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean, idleFrame: boolean) => void) | undefined>;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas2D, setCanvas2D] = useState<HTMLCanvasElement | null>(null);
    const [context2D, setContext2D] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const viewMode = useAppSelector(selectViewMode);
    const grid = useAppSelector(selectGrid);
    const cameraType = useAppSelector(selectCameraType);
    const centerLinePos = useAppSelector(selectCurrentCenter);
    const centerLineProfile = useAppSelector(selectProfile);
    const followDeviations = useAppSelector(selectFollowDeviations);

    const renderGridLabels = useCallback(() => {
        if (
            !view ||
            !grid.enabled ||
            !context2D ||
            cameraType !== CameraType.Orthographic ||
            view.renderState.camera.fov > 35
        ) {
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
            drawTexts(context2D, pts.screenPoints, labels);
        }
    }, [grid, context2D, view, cameraType]);

    const drawId = useRef(0);
    const render = useCallback(
        async (idleFrame: boolean) => {
            if (view && context2D && canvas2D && size) {
                const id = ++drawId.current;

                let centerLine2dPos: undefined | vec2 = undefined;
                let projection: undefined | DeviationProjection = undefined;
                const showFollowPoint = viewMode === ViewMode.FollowPath && idleFrame;
                const showDeviationLables = showFollowPoint && cameraType === CameraType.Orthographic;
                if (showFollowPoint) {
                    if (centerLinePos) {
                        const sp = view.measure?.draw.toMarkerPoints([centerLinePos]);
                        if (sp && sp.length > 0 && sp[0]) {
                            projection = {
                                centerPoint2d: sp[0],
                                centerPoint3d: centerLinePos,
                            };
                            centerLine2dPos = vec2.clone(sp[0]);
                        }
                    }
                }
                const [deviations] = await Promise.all([
                    showDeviationLables
                        ? view.inspectDeviations({
                              deviationPrioritization: followDeviations.prioritization,
                              projection,
                              generateLine: followDeviations.line,
                          })
                        : undefined,
                ]);

                if (id !== drawId.current) {
                    return;
                }
                context2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

                if (deviations) {
                    const pts2d: vec2[] = [];
                    const labels: string[] = [];
                    if (centerLine2dPos) {
                        drawPoint(context2D, centerLine2dPos, "black");
                        centerLine2dPos[1] += 20;
                        drawTexts(context2D, [centerLine2dPos], [`H: ${centerLinePos![2].toFixed(3)}`], 24);
                        centerLine2dPos[1] -= 50;
                        drawTexts(context2D, [centerLine2dPos], ["P: " + centerLineProfile], 24);
                    }
                    if (deviations) {
                        for (const d of deviations.labels) {
                            pts2d.push(d.position);
                            labels.push(d.deviation);
                        }
                    }
                    drawTexts(context2D, pts2d, labels, 20);

                    if (deviations?.line) {
                        drawLineStrip(context2D, deviations.line, vecToHex(followDeviations.lineColor));
                    }
                }

                renderGridLabels();
            }
        },
        [
            canvas2D,
            context2D,
            view,
            size,
            renderGridLabels,
            viewMode,
            cameraType,
            centerLinePos,
            centerLineProfile,
            followDeviations,
        ]
    );

    useEffect(() => {
        render(false);
    }, [render]);

    useEffect(() => {
        setContext2D(canvas2D?.getContext("2d"));
    }, [canvas2D]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);
        function animate(moved: boolean, idleFrame: boolean) {
            if (view) {
                const run =
                    moved ||
                    (viewMode === ViewMode.FollowPath &&
                        cameraType === CameraType.Orthographic &&
                        idleFrame &&
                        view.renderState.camera.far < 1);

                if (!run) {
                    return;
                }
                render(idleFrame);
            }
        }
    }, [view, render, grid, cameraType, renderFnRef, followDeviations, viewMode]);

    return <Canvas2D id="canvas2D" ref={setCanvas2D} width={size.width} height={size.height} />;
}
