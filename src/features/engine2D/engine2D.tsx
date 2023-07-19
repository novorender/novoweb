import { css, styled } from "@mui/material";
import { DrawProduct, DrawableEntity, MeasureSettings } from "@novorender/measure-api";
import { ReadonlyVec2, mat3, quat, vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { measureApi } from "app";
import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectArea, selectAreaDrawPoints } from "features/area";
import {
    selectDrawSelectedPositions,
    selectFollowCylindersFrom,
    selectShowTracer,
    usePathMeasureObjects,
} from "features/followPath";
import { useCrossSection } from "features/followPath/useCrossSection";
import { useHeightProfileMeasureObject } from "features/heightProfile";
import {
    selectManholeCollisionTarget,
    selectManholeCollisionValues,
    selectManholeMeasureValues,
} from "features/manhole";
import { selectMeasure, useMeasureObjects } from "features/measure";
import { selectCrossSectionPoints } from "features/orthoCam";
import { selectPointLine } from "features/pointLine";
import { CameraType, selectCameraType, selectGrid, selectViewMode } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";

import { drawPart, drawProduct, drawTexts } from "./utils";

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

const measurementFillColor = "rgba(0, 191, 255, 0.15)";
const measurementPointColor = "rgba(0, 191, 255, 0.75)";
const measurementLineColor = "rgba(255, 255, 0, 1)";
const measurementInactiveFillColor = "rgba(0, 191, 255, 0.075)";
const measurementInactivePointColor = "rgba(0, 191, 255, 0.25)";
const measurementInactiveLineColor = "rgba(255, 255, 0, 0.4)";
const hoverFillColor = "rgba(0, 170, 200, 0.3)";
const hoverLineColor = "rgba(255, 165, 0, 1)";

export function Engine2D({
    pointerPos,
    renderFnRef,
}: {
    pointerPos: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<VoidFunction | undefined>;
}) {
    const {
        state: { size, view, measureScene },
    } = useExplorerGlobals();
    const [canvas2D, setCanvas2D] = useState<HTMLCanvasElement | null>(null);
    const [context2D, setContext2D] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const prevCamPos = useRef<vec3>();
    const prevCamRot = useRef<quat>();

    const heightProfileMeasureObject = useHeightProfileMeasureObject();
    const measureObjects = useMeasureObjects();
    const pathMeasureObjects = usePathMeasureObjects();
    const roadCrossSection = useCrossSection();
    const roadCrossSectionData = roadCrossSection.status === AsyncStatus.Success ? roadCrossSection.data : undefined;
    const pathMeasureObjectsData =
        pathMeasureObjects.status === AsyncStatus.Success ? pathMeasureObjects.data : undefined;
    const areaValue = useAppSelector(selectArea);
    const { points: pointLinePoints, result: pointLineResult } = useAppSelector(selectPointLine);
    const crossSection = useAppSelector(selectCrossSectionPoints);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const manholeCollisionValues = useAppSelector(selectManholeCollisionValues);
    const manholeCollisionEntity = useAppSelector(selectManholeCollisionTarget)?.entity;
    const areaPoints = useAppSelector(selectAreaDrawPoints);
    const drawSelectedPaths = useAppSelector(selectDrawSelectedPositions);
    const drawPathSettings = useAppSelector(selectFollowCylindersFrom);
    const measure = useAppSelector(selectMeasure);
    const cameraType = useAppSelector(selectCameraType);
    const grid = useAppSelector(selectGrid);
    const viewMode = useAppSelector(selectViewMode);
    const showTracer = useAppSelector(selectShowTracer);

    const prevPointerPos = useRef([0, 0] as Vec2);

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
        const pts = measureApi.toPathPoints(pts3d, size.width, size.height, view.renderState.camera);

        if (pts) {
            drawTexts(context2D, pts.screenPoints, labels);
        }
    }, [grid, context2D, view, cameraType, size]);

    const drawId = useRef(0);
    const render = useCallback(async () => {
        if (view && context2D && measureScene && measureApi && canvas2D && size) {
            const { camera } = view.renderState;
            const cameraDirection = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), camera.rotation);
            const camSettings = { pos: camera.position, dir: cameraDirection };
            const getDrawMeasureEntity = async (entity?: DrawableEntity, settings?: MeasureSettings) =>
                entity &&
                measureApi.getDrawMeasureEntity(
                    size.width,
                    size.height,
                    view.renderState.camera,
                    measureScene,
                    entity,
                    settings
                );
            const id = ++drawId.current;

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

            if (id !== drawId.current) {
                return;
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
                        3,
                        { type: "default" }
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
                                    type: "centerOfLine",
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
                                    type: "centerOfLine",
                                }
                            );
                            break;
                        case "x-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "red" }, 3, {
                                type: "centerOfLine",
                            });
                            break;
                        case "y-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 3, {
                                type: "centerOfLine",
                            });
                            break;
                        case "z-axis":
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 3, {
                                type: "centerOfLine",
                            });
                            break;
                        case "xy-plane":
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 3, {
                                type: "centerOfLine",
                            });
                            break;
                        case "z-angle":
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 2, {
                                type: "centerOfLine",
                            });
                            break;
                        case "xz-angle":
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 2, {
                                type: "centerOfLine",
                            });
                            break;
                        case "cylinder-angle":
                            cylinderAngleDrawn = drawPart(context2D, camSettings, part, { lineColor: "blue" }, 2, {
                                type: "centerOfLine",
                            });
                            break;
                        case "cylinder-angle-line":
                            if (cylinderAngleDrawn) {
                                drawPart(context2D, camSettings, part, { lineColor: "blue" }, 2, {
                                    type: "centerOfLine",
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
                    size.width,
                    size.height,
                    view.renderState.camera,
                    manholeCollisionValues.lid,
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
                                    type: "centerOfLine",
                                    customText: [
                                        vec3
                                            .len(
                                                vec3.sub(
                                                    vec3.create(),
                                                    manholeCollisionValues.lid[0],
                                                    manholeCollisionValues.lid![1]
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
                const drawProd = measureApi.getDrawObjectFromPoints(
                    size.width,
                    size.height,
                    view.renderState.camera,
                    areaPoints,
                    true,
                    true
                );
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

            //Measure tracer
            if (
                showTracer &&
                cameraType === CameraType.Orthographic &&
                viewMode === ViewMode.FollowPath &&
                roadCrossSectionData &&
                roadCrossSectionData.length > 1
            ) {
                const prods = roadCrossSectionData
                    .map((road) =>
                        measureApi.getDrawObjectFromPoints(
                            size.width,
                            size.height,
                            view.renderState.camera,
                            road.points,
                            false,
                            false
                        )
                    )
                    .filter((prod) => prod) as DrawProduct[];

                if (prods.length) {
                    let line = {
                        start: vec2.fromValues(pointerPos.current[0], size.height),
                        end: vec2.fromValues(pointerPos.current[0], 0),
                    };

                    const normal = measureApi.get2dNormal(prods[0], line);
                    if (normal) {
                        line = {
                            start: vec2.scaleAndAdd(vec2.create(), normal.position, normal.normal, size.height),
                            end: vec2.scaleAndAdd(vec2.create(), normal.position, normal.normal, -size.height),
                        };
                    }

                    const traceDraw = measureApi.traceDrawObjects(prods, line);
                    traceDraw.objects.forEach((obj) => {
                        obj.parts.forEach((part) => {
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                {
                                    lineColor: "black",
                                    displayAllPoints: true,
                                },
                                2,
                                {
                                    type: "default",
                                }
                            );
                        });
                    });
                }
            }

            if (pointLinePoints.length && pointLineResult) {
                const drawProd = measureApi.getDrawObjectFromPoints(
                    size.width,
                    size.height,
                    view.renderState.camera,
                    pointLinePoints,
                    false,
                    true,
                    true
                );

                if (drawProd) {
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
                                    type: "default",
                                }
                            );
                        });
                    });
                }
            }

            if (crossSection) {
                const drawProd = measureApi.getDrawObjectFromPoints(
                    size.width,
                    size.height,
                    view.renderState.camera,
                    crossSection,
                    false,
                    false
                );
                if (drawProd) {
                    drawProd.objects.forEach((obj) => {
                        obj.parts.forEach((part) => {
                            drawPart(
                                context2D,
                                camSettings,
                                part,
                                {
                                    lineColor: "black",
                                    pointColor: "black",
                                    displayAllPoints: true,
                                },
                                2
                            );
                        });
                    });
                }
                if (crossSection.length > 1) {
                    const mat = mat3.fromQuat(mat3.create(), camera.rotation);
                    if (mat[8] === 1) {
                        // top-down
                        let up = vec3.fromValues(mat[6], mat[7], mat[8]);
                        const dir = vec3.sub(vec3.create(), crossSection[1], crossSection[0]);
                        vec3.normalize(dir, dir);
                        const cross = vec3.cross(vec3.create(), dir, up);
                        vec3.normalize(cross, cross);
                        const center = vec3.add(vec3.create(), crossSection[0], crossSection[1]);
                        vec3.scale(center, center, 0.5);
                        const offsetP = vec3.scaleAndAdd(vec3.create(), center, cross, -3);
                        const arrow = measureApi.getDrawObjectFromPoints(
                            size.width,
                            size.height,
                            view.renderState.camera,
                            [center, offsetP],
                            false,
                            false
                        );
                        if (arrow) {
                            arrow.objects.forEach((obj) => {
                                obj.parts.forEach((part) => {
                                    drawPart(
                                        context2D,
                                        camSettings,
                                        part,
                                        {
                                            lineColor: "black",
                                            pointColor: "black",
                                        },
                                        2,
                                        undefined,
                                        { end: "arrow" }
                                    );
                                });
                            });
                        }
                    }
                }
            }

            if (roadCrossSectionData && viewMode === ViewMode.FollowPath) {
                roadCrossSectionData.forEach((section) => {
                    const colorList: string[] = [];
                    section.codes.forEach((c) => {
                        switch (c) {
                            case 10:
                                return;
                            case 0:
                                colorList.push("green");
                                break;
                            case 1:
                                colorList.push("#333232");
                                break;
                            case 2:
                                colorList.push("black");
                                break;
                            case 3:
                                colorList.push("blue");
                                break;
                            default:
                                colorList.push("brown");
                        }
                    });
                    const drawProd = measureApi.getDrawObjectFromPoints(
                        size.width,
                        size.height,
                        view.renderState.camera,
                        section.points,
                        false,
                        false
                    );
                    if (drawProd) {
                        drawProd.objects.forEach((obj) => {
                            obj.parts.forEach((part) => {
                                drawPart(
                                    context2D,
                                    camSettings,
                                    part,
                                    {
                                        lineColor: colorList,
                                    },
                                    2,
                                    { type: "default" }
                                );
                            });
                        });
                    }
                    const slopeL = measureApi.getDrawText(
                        size.width,
                        size.height,
                        view.renderState.camera,
                        [section.slopes.left.start, section.slopes.left.end],
                        (section.slopes.left.slope * 100).toFixed(1) + "%"
                    );
                    const slopeR = measureApi.getDrawText(
                        size.width,
                        size.height,
                        view.renderState.camera,
                        [section.slopes.right.start, section.slopes.right.end],
                        (section.slopes.right.slope * 100).toFixed(1) + "%"
                    );
                    if (slopeL && slopeR) {
                        drawProduct(context2D, camSettings, slopeL, {}, 3, { type: "default" });
                        drawProduct(context2D, camSettings, slopeR, {}, 3, { type: "default" });
                    }
                });
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
        crossSection,
        roadCrossSectionData,
        viewMode,
        cameraType,
        pointerPos,
        showTracer,
    ]);

    useEffect(() => {
        render();
    }, [render]);

    useEffect(() => {
        setContext2D(canvas2D?.getContext("2d"));
    }, [canvas2D]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);

        function animate() {
            if (view) {
                const { camera } = view.renderState;
                if (
                    cameraType === CameraType.Orthographic ||
                    !prevCamRot.current ||
                    !quat.exactEquals(prevCamRot.current, camera.rotation) ||
                    !prevCamPos.current ||
                    !vec3.exactEquals(prevCamPos.current, camera.position) ||
                    !prevCamPos.current ||
                    !vec3.exactEquals(prevCamPos.current, camera.position) ||
                    !vec2.exactEquals(prevPointerPos.current, pointerPos.current)
                ) {
                    prevCamRot.current = quat.clone(camera.rotation);
                    prevCamPos.current = vec3.clone(camera.position);
                    prevPointerPos.current = [...pointerPos.current];
                    render();
                }
            }
        }
    }, [view, render, grid, cameraType, pointerPos, renderFnRef]);

    return <Canvas2D id="canvas2D" ref={setCanvas2D} width={size.width} height={size.height} />;
}
