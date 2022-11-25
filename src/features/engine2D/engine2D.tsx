import { DrawableEntity, MeasureSettings } from "@novorender/measure-api";
import { css, styled } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { quat, vec3 } from "gl-matrix";

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

import { drawPart, drawProduct } from "../engine2D/utils";

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

const measurementFillColor = "rgba(0, 191, 255, 0.5)";

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

    const renderParametricMeasure = useCallback(async () => {
        if (view && context2D && measureScene && measureApi && canvas2D) {
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
            ]);

            context2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

            measureObjectsDrawResult.forEach(
                (prod) =>
                    prod &&
                    drawProduct(
                        context2D,
                        camSettings,
                        prod,
                        { lineColor: "yellow", fillColor: measurementFillColor, complexCylinder: true },
                        3
                    )
            );

            if (duoDrawResult && duoDrawResult.objects.length === 1) {
                const obj = duoDrawResult.objects[0];
                for (const part of obj.parts) {
                    switch (part.name) {
                        case "result":
                            drawPart(context2D, camSettings, part, { lineColor: "green", pointColor: "green" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "normal":
                            drawPart(context2D, camSettings, part, { lineColor: "black", pointColor: "black" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "x-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "red" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "y-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "lightgreen" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "z-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "xy-plane":
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 3, {
                                type: "distance",
                            });
                            break;
                        case "z-angle":
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 2, {
                                type: "distance",
                            });
                            break;
                        case "xz-angle":
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 2, {
                                type: "distance",
                            });
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

            if (manholeCollisionValues && manholeCollisionValues.outer) {
                const colVal = measureApi.getDrawObjectFromPoints(view, manholeCollisionValues.outer, false, true);
                if (colVal) {
                    colVal.objects.forEach((obj) => {
                        obj.parts.forEach((part) => {
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                {
                                    lineColor: "blue",
                                    pointColor: "black",
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
    ]);

    useEffect(() => {
        renderParametricMeasure();
    }, [renderParametricMeasure]);

    useEffect(() => {
        setContext2D(canvas2D?.getContext("2d"));
    }, [scene, canvas2D]);

    useEffect(() => {
        animate();
        function animate() {
            if (view) {
                if (
                    !prevCamRot.current ||
                    !quat.exactEquals(prevCamRot.current, view.camera.rotation) ||
                    !prevCamPos.current ||
                    !vec3.exactEquals(prevCamPos.current, view.camera.position)
                ) {
                    prevCamRot.current = quat.clone(view.camera.rotation);
                    prevCamPos.current = vec3.clone(view.camera.position);
                    renderParametricMeasure();
                }
            }

            animationFrameId.current = requestAnimationFrame(() => animate());
        }
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view, renderParametricMeasure]);

    return <Canvas2D ref={setCanvas2D} width={size.width} height={size.height}></Canvas2D>;
}
