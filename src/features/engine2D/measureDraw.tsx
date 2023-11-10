import { css, styled } from "@mui/material";
import { DrawableEntity, DrawProduct, MeasureSettings, ParametricEntity } from "@novorender/api";
import { mat3, ReadonlyVec2, vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectArea, selectAreaDrawPoints } from "features/area";
import { GetMeasurePointsFromTracer, selectOutlineLasers } from "features/clippingOutline";
import {
    selectDrawSelectedPositions,
    selectFollowCylindersFrom,
    selectShowTracer,
    selectVerticalTracer,
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

import { CameraSettings, drawPart, drawProduct } from "./utils";

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

function toId(obj: ParametricEntity) {
    return `${obj.ObjectId}_${obj.instanceIndex}_${obj.pathIndex}`;
}

function drawMeasureObjects(
    objectDraw: Map<string, { product: DrawProduct | undefined; updated: number }>,
    drawId: number,
    hoverObjectDrawResult: DrawProduct | undefined,
    hoverHideId: string | undefined,
    context2D: CanvasRenderingContext2D,
    camSettings: CameraSettings
) {
    const deleteIds: string[] = [];
    for (const draw of objectDraw) {
        if (draw[1].updated < drawId) {
            deleteIds.push(draw[0]);
            continue;
        }
        const prod = draw[1].product;
        if (prod) {
            const inactiveDueToHover = hoverObjectDrawResult !== undefined && draw[0] === hoverHideId;
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
            if (draw[0] === "-1") {
                deleteIds.push(draw[0]);
            }
        }
    }

    for (const id of deleteIds) {
        objectDraw.delete(id);
    }

    if (hoverObjectDrawResult) {
        drawProduct(
            context2D,
            camSettings,
            hoverObjectDrawResult,
            { lineColor: hoverLineColor, fillColor: hoverFillColor, pointColor: hoverLineColor },
            5
        );
    }
}

function drawDuoResults(
    resultDraw: Map<number, { product: DrawProduct | undefined; updated: number }>,
    drawId: number,
    context2D: CanvasRenderingContext2D,
    camSettings: CameraSettings
) {
    const deleteIds: number[] = [];
    for (const draw of resultDraw) {
        if (draw[1].updated < drawId) {
            deleteIds.push(draw[0]);
            continue;
        }
        const duoDrawResult = draw[1].product;
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
                        const a = vec2.dist(l[0], part.vertices2D[0]) < 10 && vec2.dist(l[1], part.vertices2D[1]) < 10;
                        const b = vec2.dist(l[0], part.vertices2D[1]) < 10 && vec2.dist(l[1], part.vertices2D[0]) < 10;
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
    }

    for (const id of deleteIds) {
        resultDraw.delete(id);
    }
}

export function MeasureDraw({
    pointerPos,
    renderFnRef,
}: {
    pointerPos: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<((moved: boolean, idleFrame: boolean) => void) | undefined>;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas2D, setCanvas2D] = useState<HTMLCanvasElement | null>(null);
    const [context2D, setContext2D] = useState<CanvasRenderingContext2D | null | undefined>(null);

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
    const traceVerical = useAppSelector(selectVerticalTracer);

    const outlineLasers = useAppSelector(selectOutlineLasers);

    const prevPointerPos = useRef([0, 0] as Vec2);
    const resultDraw = useRef(new Map<number, { product: DrawProduct | undefined; updated: number }>());
    const objectDraw = useRef(new Map<string, { product: DrawProduct | undefined; updated: number }>());

    const drawId = useRef(0);
    const render = useCallback(async () => {
        if (view?.measure && context2D && canvas2D && size) {
            const { camera } = view.renderState;
            const cameraDirection = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), camera.rotation);
            const camSettings = { pos: camera.position, dir: cameraDirection };
            const getDrawMeasureEntity = async (entity?: DrawableEntity, settings?: MeasureSettings) =>
                entity && view.measure?.draw.getDrawEntity(entity, settings);
            const id = ++drawId.current;

            const [
                followPathDrawResult,
                heightProfileDrawResult,
                manholeDrawResult,
                manholeCollisionEntityDrawResult,
                hoverObjectDrawResult,
            ] = await Promise.all([
                Promise.all(
                    (drawSelectedPaths ? pathMeasureObjectsData ?? [] : []).map((obj) =>
                        getDrawMeasureEntity(obj, {
                            cylinderMeasure: drawPathSettings,
                            segmentLabelInterval: 10,
                        })
                    )
                ),
                getDrawMeasureEntity(heightProfileMeasureObject),
                getDrawMeasureEntity(manhole),
                getDrawMeasureEntity(manholeCollisionEntity),
                getDrawMeasureEntity(measure.hover),
            ]);

            let hoverHideId: string | undefined;
            for (let i = 0; i < measureObjects.length; ++i) {
                const obj = measureObjects[i];
                if (obj.drawKind === "vertex") {
                    objectDraw.current.set("-1", { product: await getDrawMeasureEntity(obj), updated: id });
                    continue;
                }
                const objId = toId(obj);
                const draw = objectDraw.current.get(objId);
                if (measure.pinned !== i) {
                    hoverHideId = objId;
                }
                if (draw) {
                    if (draw.product) {
                        view.measure.draw.updateProuct(draw.product);
                        if (draw.updated > id) {
                            return;
                        }
                        draw.updated = id;
                    }
                } else {
                    const drawProd = await getDrawMeasureEntity(obj, {
                        ...obj.settings,
                        segmentLabelInterval: 10,
                    });
                    objectDraw.current.set(objId, { product: drawProd, updated: id });
                }
            }

            if (measure.duoMeasurementValues?.result) {
                const res = resultDraw.current.get(measure.duoMeasurementValues.id);
                if (res) {
                    if (res.product) {
                        view.measure.draw.updateProuct(res.product);
                        if (res.updated > id) {
                            return;
                        }
                        res.updated = id;
                    }
                } else {
                    const resDraw = await getDrawMeasureEntity(measure.duoMeasurementValues?.result);
                    resultDraw.current.set(measure.duoMeasurementValues.id, { product: resDraw, updated: id });
                }
            }

            if (id !== drawId.current) {
                return;
            }
            context2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

            for (const trace of outlineLasers) {
                const renderTrace = (drawProd: DrawProduct | undefined, color: string) => {
                    if (drawProd) {
                        drawProd.objects.forEach((obj) => {
                            obj.parts.forEach((part) => {
                                drawPart(
                                    context2D,
                                    camSettings,
                                    part,
                                    {
                                        lineColor: color,
                                    },
                                    2,
                                    {
                                        type: "default",
                                    }
                                );
                            });
                        });
                    }
                };

                const { left, right, up, down, measurementX: x, measurementY: y } = trace;
                if (x) {
                    const tracePts = GetMeasurePointsFromTracer(x, left, right);
                    if (tracePts) {
                        renderTrace(
                            view.measure?.draw.getDrawObjectFromPoints(tracePts, false, false, true, 2),
                            "blue"
                        );
                    }
                }
                if (y) {
                    const tracePts = GetMeasurePointsFromTracer(y, down, up);
                    if (tracePts) {
                        renderTrace(
                            view.measure?.draw.getDrawObjectFromPoints(tracePts, false, false, true, 2),
                            "green"
                        );
                    }
                }
            }

            drawMeasureObjects(objectDraw.current, id, hoverObjectDrawResult, hoverHideId, context2D, camSettings);
            drawDuoResults(resultDraw.current, id, context2D, camSettings);

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
                const colVal = view.measure?.draw.getDrawObjectFromPoints(manholeCollisionValues.lid, false, true);
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
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(areaPoints, true, true);
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
                    .map((road) => view.measure?.draw.getDrawObjectFromPoints(road.points, false, false))
                    .filter((prod) => prod) as DrawProduct[];

                if (prods.length) {
                    let line = {
                        start: vec2.fromValues(pointerPos.current[0], size.height),
                        end: vec2.fromValues(pointerPos.current[0], 0),
                    };

                    if (!traceVerical) {
                        const normal = view.measure?.draw.get2dNormal(prods[0], line);
                        if (normal) {
                            line = {
                                start: vec2.scaleAndAdd(vec2.create(), normal.position, normal.normal, size.height),
                                end: vec2.scaleAndAdd(vec2.create(), normal.position, normal.normal, -size.height),
                            };
                        }
                    }

                    const traceDraw = view.measure?.draw.getTraceDrawOject(prods, line);
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
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(pointLinePoints, false, true, true);

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
                const drawProd = view.measure?.draw.getDrawObjectFromPoints(crossSection, false, false);
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
                        const arrow = view.measure?.draw.getDrawObjectFromPoints([center, offsetP], false, false);
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
                    const drawProd = view.measure?.draw.getDrawObjectFromPoints(section.points, false, false);
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
                    const slopeL = view.measure?.draw.getDrawText(
                        [section.slopes.left.start, section.slopes.left.end],
                        (section.slopes.left.slope * 100).toFixed(1) + "%"
                    );
                    const slopeR = view.measure?.draw.getDrawText(
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
        measure.hover,
        measure.pinned,
        crossSection,
        roadCrossSectionData,
        viewMode,
        cameraType,
        pointerPos,
        showTracer,
        traceVerical,
        outlineLasers,
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
        function animate(moved: boolean) {
            if (view) {
                const run = moved || (showTracer && !vec2.exactEquals(prevPointerPos.current, pointerPos.current));
                if (!run) {
                    return;
                }

                prevPointerPos.current = [...pointerPos.current];
                render();
            }
        }
    }, [view, render, grid, cameraType, pointerPos, renderFnRef, showTracer, viewMode]);

    return <Canvas2D id="canvas2D" ref={setCanvas2D} width={size.width} height={size.height} />;
}
