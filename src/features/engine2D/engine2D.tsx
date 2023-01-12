import { DrawableEntity, MeasureSettings } from "@novorender/measure-api";
import { css, styled } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { quat, ReadonlyVec2, vec2, vec3 } from "gl-matrix";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHeightProfileMeasureObject } from "features/heightProfile";
import { selectMeasure, useMeasureObjects } from "features/measure";
import { selectDrawSelectedPositions, selectFollowCylindersFrom, usePathMeasureObjects } from "features/followPath";
import { selectArea, selectAreaDrawPoints } from "features/area";
import { selectPointLine } from "features/pointLine";
import {
    selectManholeCollisionTarget,
    selectManholeCollisionValues,
    selectManholeMeasureValues,
} from "features/manhole";
import { measureApi } from "app";
import { AsyncStatus } from "types/misc";
import { CameraType, selectCameraType, selectGrid } from "slices/renderSlice";

import { drawPart, drawProduct, drawTexts } from "../engine2D/utils";

const Canvas2D = styled("canvas")(
    () => css`
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
    `
);

const measurementFillColor = "rgba(0, 191, 255, 0.15)";
const measurementPointColor = "rgba(0, 191, 255, 0.75)";
const measurementLineColor = "rgba(255, 255, 0, 1)";
const measurementInactiveFillColor = "rgba(0, 191, 255, 0.075)";
const measurementInactivePointColor = "rgba(0, 191, 255, 0.25)";
const measurementInactiveLineColor = "rgba(255, 255, 0, 0.4)";
const hoverFillColor = "rgba(0, 170, 200, 0.3)";
const hoverLineColor = "rgba(255, 165, 0, 1)";

export function Engine2D() {
    const {
        state: { size, scene, view, measureScene },
    } = useExplorerGlobals();
    const [canvas2D, setCanvas2D] = useState<HTMLCanvasElement | null>(null);
    const [context2D, setContext2D] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const animationFrameId = useRef<number>(-1);

    const prevCamPos = useRef<vec3>();
    const prevCamRot = useRef<quat>();

    const heightProfileMeasureObject = useHeightProfileMeasureObject();
    const measureObjects = useMeasureObjects();
    const pathMeasureObjects = usePathMeasureObjects();
    const pathMeasureObjectsData =
        pathMeasureObjects.status === AsyncStatus.Success ? pathMeasureObjects.data : undefined;
    const areaValue = useAppSelector(selectArea);
    const { points: pointLinePoints, result: pointLineResult } = useAppSelector(selectPointLine);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const manholeCollisionValues = useAppSelector(selectManholeCollisionValues);
    const manholeCollisionEntity = useAppSelector(selectManholeCollisionTarget)?.entity;
    const areaPoints = useAppSelector(selectAreaDrawPoints);
    const drawSelectedPaths = useAppSelector(selectDrawSelectedPositions);
    const drawPathSettings = useAppSelector(selectFollowCylindersFrom);
    const measure = useAppSelector(selectMeasure);
    const cameraType = useAppSelector(selectCameraType);
    const grid = useAppSelector(selectGrid);

    const renderGridLabels = useCallback(() => {
        if (
            grid.enabled &&
            (view?.camera?.fieldOfView ?? 250) <= 35 &&
            context2D &&
            cameraType === CameraType.Orthographic
        ) {
            const xLen = vec3.len(grid.axisX);
            const yLen = vec3.len(grid.axisY);
            const pts3d: vec3[] = [];
            const labels: string[] = [];
            const numLables = Math.min(10, grid.majorLineCount);
            for (let i = 0; i < numLables; ++i) {
                const xLabel = (xLen * i).toFixed(1);
                const yLabel = (yLen * i).toFixed(1);
                pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origo, grid.axisX, i));
                labels.push(xLabel);
                if (i === 0) {
                    continue;
                }

                pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origo, grid.axisX, -i));
                labels.push(`-${xLabel}`);

                pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origo, grid.axisY, i));
                labels.push(yLabel);
                pts3d.push(vec3.scaleAndAdd(vec3.create(), grid.origo, grid.axisY, -i));
                labels.push(`-${yLabel}`);
            }
            const pts = measureApi.toPathPoints(pts3d, view);
            if (pts) {
                drawTexts(context2D, pts[0], labels);
            }
        }
    }, [grid, context2D, view, cameraType]);

    const render = useCallback(async () => {
        if (view && context2D && measureScene && measureApi && canvas2D && size) {
            const { camera } = view;
            const cameraDirection = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), camera.rotation);
            const camSettings = { pos: camera.position, dir: cameraDirection };
            const getDrawMeasureEntity = async (entity?: DrawableEntity, settings?: MeasureSettings) =>
                entity && measureApi.getDrawMeasureEntity(view, measureScene, entity, settings);

            const [
                duoDrawResult,
                measureObjectsDrawResult,
                followPathDrawResult,
                heightProfileDrawResult,
                manholeDrawResult,
                manholeCollisionEntityDrawResult,
                hoverObjectDrawResult,
            ] = await Promise.all([
                getDrawMeasureEntity(measure.duoMeasurementValues),
                Promise.all(measureObjects.map((obj) => getDrawMeasureEntity(obj, obj.settings))),
                Promise.all(
                    (drawSelectedPaths ? pathMeasureObjectsData ?? [] : []).map((obj) =>
                        getDrawMeasureEntity(obj, {
                            cylinderMeasure: drawPathSettings,
                        })
                    )
                ),
                getDrawMeasureEntity(heightProfileMeasureObject),
                getDrawMeasureEntity(manhole),
                getDrawMeasureEntity(manholeCollisionEntity),
                getDrawMeasureEntity(measure.hover),
            ]);

            if (measure.duoMeasurementValues) {
                getDrawMeasureEntity(measure.duoMeasurementValues);
            }
            context2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

            renderGridLabels();

            measureObjectsDrawResult.forEach((prod, index) => {
                if (prod) {
                    const inactiveDueToHover = hoverObjectDrawResult !== undefined && measure.pinned !== index;
                    drawProduct(
                        context2D,
                        camSettings,
                        prod,
                        {
                            lineColor: inactiveDueToHover ? measurementInactiveLineColor : measurementLineColor,
                            fillColor: inactiveDueToHover ? measurementInactiveFillColor : measurementFillColor,
                            pointColor: inactiveDueToHover ? measurementInactivePointColor : measurementPointColor,
                            complexCylinder: true,
                        },
                        3
                    );
                }
            });

            if (duoDrawResult && duoDrawResult.objects.length === 1) {
                const obj = duoDrawResult.objects[0];
                const lines: [ReadonlyVec2, ReadonlyVec2][] = [];
                let cylinderAngleDrawn = false;
                for (const part of obj.parts) {
                    if (part.vertices2D === undefined) {
                        continue;
                    }
                    let skip = false;
                    if (part.vertices2D.length === 2) {
                        for (const l of lines) {
                            const a =
                                vec2.dist(l[0], part.vertices2D[0]) < 10 && vec2.dist(l[1], part.vertices2D[1]) < 10;
                            const b =
                                vec2.dist(l[0], part.vertices2D[1]) < 10 && vec2.dist(l[1], part.vertices2D[0]) < 10;
                            if (a || b) {
                                skip = true;
                            }
                        }
                        lines.push([part.vertices2D[0], part.vertices2D[1]]);
                    }
                    if (skip) {
                        continue;
                    }

                    switch (part.name) {
                        case "result":
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                {
                                    lineColor: "lightgreen",
                                    pointColor: { start: "green", middle: "white", end: "blue" },
                                    displayAllPoints: true,
                                },
                                3,
                                {
                                    type: "distance",
                                }
                            );
                            break;
                        case "normal":
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                { lineColor: "black", pointColor: "black", displayAllPoints: true },
                                3,
                                {
                                    type: "distance",
                                }
                            );
                            break;
                        case "x-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "red" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "y-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "z-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "xy-plane":
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "z-angle":
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 2, {
                                type: "distance",
                            });
                            break;
                        case "xz-angle":
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 2, {
                                type: "distance",
                            });
                            break;
                        case "cylinder-angle":
                            cylinderAngleDrawn = drawPart(context2D, camSettings, part, { lineColor: "blue" }, 2, {
                                type: "distance",
                            });
                            break;
                        case "cylinder-angle-line":
                            if (cylinderAngleDrawn) {
                                drawPart(context2D, camSettings, part, { lineColor: "blue" }, 2, {
                                    type: "distance",
                                });
                            }
                            break;
                    }
                }
            }

            followPathDrawResult.forEach(
                (prod) =>
                    prod &&
                    drawProduct(
                        context2D,
                        camSettings,
                        prod,
                        { lineColor: "yellow", fillColor: measurementFillColor },
                        3
                    )
            );

            if (hoverObjectDrawResult) {
                drawProduct(
                    context2D,
                    camSettings,
                    hoverObjectDrawResult,
                    { lineColor: hoverLineColor, fillColor: hoverFillColor, pointColor: hoverLineColor },
                    5
                );
            }
            if (heightProfileDrawResult) {
                drawProduct(
                    context2D,
                    camSettings,
                    heightProfileDrawResult,
                    { lineColor: "yellow", fillColor: measurementFillColor },
                    3
                );
            }

            if (manholeDrawResult) {
                drawProduct(
                    context2D,
                    camSettings,
                    manholeDrawResult,
                    { lineColor: "yellow", fillColor: measurementFillColor },
                    3
                );
            }

            if (manholeCollisionEntityDrawResult) {
                drawProduct(
                    context2D,
                    camSettings,
                    manholeCollisionEntityDrawResult,
                    { lineColor: "yellow", fillColor: measurementFillColor },
                    3
                );
            }

            if (manholeCollisionValues && (manholeCollisionValues.outer || manholeCollisionValues.inner)) {
                const colVal = measureApi.getDrawObjectFromPoints(
                    view,
                    manholeCollisionValues.inner ?? manholeCollisionValues.outer!,
                    false,
                    true
                );
                if (colVal) {
                    colVal.objects.forEach((obj) => {
                        obj.parts.forEach((part) => {
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                {
                                    lineColor: "#55802b",
                                    pointColor: "black",
                                    displayAllPoints: true,
                                },
                                2,
                                {
                                    type: "distance",
                                    customText: [
                                        vec3
                                            .len(
                                                vec3.sub(
                                                    vec3.create(),
                                                    manholeCollisionValues.outer![0],
                                                    manholeCollisionValues.outer![1]
                                                )
                                            )
                                            .toFixed(2),
                                    ],
                                }
                            );
                        });
                    });
                }
            }

            if (areaPoints.length) {
                const drawProd = measureApi.getDrawObjectFromPoints(view, areaPoints);
                if (drawProd) {
                    drawProd.objects.forEach((obj) => {
                        obj.parts.forEach((part) => {
                            drawPart(
                                context2D,
                                camSettings,
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
                                    customText: [areaValue.toFixed(2)],
                                }
                            );
                        });
                    });
                }
            }

            if (pointLinePoints.length && pointLineResult) {
                const drawProd = measureApi.getDrawObjectFromPoints(view, pointLinePoints, false, true);
                if (drawProd) {
                    const textList = pointLineResult.segmentLengts.map((v) => v.toFixed(2));
                    drawProd.objects.forEach((obj) => {
                        obj.parts.forEach((part) => {
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                {
                                    lineColor: "yellow",
                                    pointColor: { start: "green", middle: "white", end: "blue" },
                                    displayAllPoints: true,
                                },
                                2,
                                {
                                    type: "distance",
                                    customText: textList,
                                }
                            );
                        });
                    });
                }
            }
        }
    }, [
        view,
        context2D,
        measure.duoMeasurementValues,
        measureScene,
        canvas2D,
        measureObjects,
        areaPoints,
        areaValue,
        pointLinePoints,
        pointLineResult,
        drawSelectedPaths,
        pathMeasureObjectsData,
        heightProfileMeasureObject,
        manhole,
        manholeCollisionEntity,
        manholeCollisionValues,
        drawPathSettings,
        size,
        renderGridLabels,
        measure.hover,
        measure.pinned,
    ]);

    useEffect(() => {
        render();
    }, [render]);

    useEffect(() => {
        setContext2D(canvas2D?.getContext("2d"));
    }, [scene, canvas2D]);

    useEffect(() => {
        animate();
        function animate() {
            if (view) {
                if (
                    cameraType === CameraType.Orthographic ||
                    !prevCamRot.current ||
                    !quat.exactEquals(prevCamRot.current, view.camera.rotation) ||
                    !prevCamPos.current ||
                    !vec3.exactEquals(prevCamPos.current, view.camera.position)
                ) {
                    prevCamRot.current = quat.clone(view.camera.rotation);
                    prevCamPos.current = vec3.clone(view.camera.position);
                    render();
                }
            }

            animationFrameId.current = requestAnimationFrame(() => animate());
        }
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view, render, grid, renderGridLabels, cameraType]);

    return <Canvas2D id="canvas2D" ref={setCanvas2D} width={size.width} height={size.height} />;
}
