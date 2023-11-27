import { css, styled } from "@mui/material";
import { DrawableEntity, DrawProduct, MeasureSettings, ParametricEntity } from "@novorender/api";
import { mat3, ReadonlyVec2, vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectAreas, selectCurrentIndex } from "features/area";
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
import { ActiveAxis, selectMeasure, useMeasureObjects } from "features/measure";
import { MeasureInteractionPositions } from "features/measure/measureInteractions";
import { selectCrossSectionPoints } from "features/orthoCam";
import { GetMeasurePointsFromTracer, selectOutlineLasers } from "features/outlineLaser";
import { selectPointLineCurrent, selectPointLines } from "features/pointLine";
import { CameraType, Picker, selectCameraType, selectGrid, selectPicker, selectViewMode } from "features/render";
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

type AxisPosition = {
    x?: Vec2;
    y?: Vec2;
    z?: Vec2;
    plan?: Vec2;
    dist?: Vec2;
    normal?: Vec2;
};

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
    resultDraw: Map<number, { product: DrawProduct | undefined; updated: number; activeAxis: ActiveAxis }>,
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
                        if (draw[1].activeAxis.result) {
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
                        }
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
                        if (draw[1].activeAxis.x) {
                            drawPart(context2D, camSettings, part, { lineColor: "red" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "y-axis":
                        if (draw[1].activeAxis.y) {
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "z-axis":
                        if (draw[1].activeAxis.z) {
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "xy-plane":
                        if (draw[1].activeAxis.planar) {
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "z-angle":
                        if (draw[1].activeAxis.z && draw[1].activeAxis.result) {
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 2, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "xz-angle":
                        if (draw[1].activeAxis.x && draw[1].activeAxis.z) {
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 2, {
                                type: "centerOfLine",
                            });
                        }
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
    interactionPositions,
}: {
    pointerPos: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<((moved: boolean, idleFrame: boolean) => void) | undefined>;
    interactionPositions: MutableRefObject<MeasureInteractionPositions>;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas2D, setCanvas2D] = useState<HTMLCanvasElement | null>(null);
    const [context2D, setContext2D] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const heightProfileMeasureObject = useHeightProfileMeasureObject();
    const measureSets = useMeasureObjects();
    const pathMeasureObjects = usePathMeasureObjects();
    const roadCrossSection = useCrossSection();
    const roadCrossSectionData = roadCrossSection.status === AsyncStatus.Success ? roadCrossSection.data : undefined;
    const pathMeasureObjectsData =
        pathMeasureObjects.status === AsyncStatus.Success ? pathMeasureObjects.data : undefined;
    const pointLines = useAppSelector(selectPointLines);
    const pointLineCurrent = useAppSelector(selectPointLineCurrent);
    const crossSection = useAppSelector(selectCrossSectionPoints);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const manholeCollisionValues = useAppSelector(selectManholeCollisionValues);
    const manholeCollisionEntity = useAppSelector(selectManholeCollisionTarget)?.entity;
    const areas = useAppSelector(selectAreas);
    const areaCurrent = useAppSelector(selectCurrentIndex);

    const picker = useAppSelector(selectPicker);
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
    const resultDraw = useRef(
        new Map<number, { product: DrawProduct | undefined; updated: number; activeAxis: ActiveAxis }>()
    );
    const objectDraw = useRef(new Map<string, { product: DrawProduct | undefined; updated: number }>());
    const followPathDrawResult = useRef<(DrawProduct | undefined)[]>([]);
    const heightProfileDrawResult = useRef<DrawProduct | undefined>(undefined);
    const manholeDrawResult = useRef<DrawProduct | undefined>(undefined);
    const manholeCollisionEntityDrawResult = useRef<DrawProduct | undefined>(undefined);
    const hoverObjectDrawResult = useRef<DrawProduct | undefined>(undefined);

    const updateId = useRef(0);
    const hoverHideId = useRef<undefined | string>(undefined);
    const update = useCallback(async () => {
        if (view?.measure) {
            const { camera } = view.renderState;
            const getDrawMeasureEntity = async (entity?: DrawableEntity, settings?: MeasureSettings) =>
                entity && view.measure?.draw.getDrawEntity(entity, settings);
            const id = ++updateId.current;

            const [
                followPathDrawObject,
                heightProfileDrawObject,
                manholeDrawObject,
                manholeCollisionEntityDrawObject,
                hoverObjectDrawObject,
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
            const removePos: (vec2 | undefined)[] = [];
            const infoPos: (vec2 | undefined)[] = [];

            followPathDrawResult.current = followPathDrawObject;
            heightProfileDrawResult.current = heightProfileDrawObject;
            manholeDrawResult.current = manholeDrawObject;
            manholeCollisionEntityDrawResult.current = manholeCollisionEntityDrawObject;
            hoverObjectDrawResult.current = hoverObjectDrawObject;
            //StructruredClone
            for (let i = 0; i < measureSets.length; ++i) {
                const measureSet = measureSets[i];
                let objectToSetMarker: undefined | DrawProduct;
                for (let j = 0; j < measureSet.length; ++j) {
                    const obj = measureSet[j];
                    if (obj.drawKind === "vertex") {
                        objectDraw.current.set("-1", { product: await getDrawMeasureEntity(obj), updated: id });
                        continue;
                    }
                    const objId = toId(obj);
                    const draw = objectDraw.current.get(objId);
                    if (measure.pinned !== j && i === measureSets.length - 1) {
                        hoverHideId.current = objId;
                    }
                    if (draw) {
                        if (draw.product) {
                            view.measure.draw.updateProuct(draw.product);
                            if (draw.updated > id) {
                                return false;
                            }
                            if (measureSet.length === 1) {
                                objectToSetMarker = draw.product;
                            }
                            draw.updated = id;
                        }
                    } else {
                        const drawProd = await getDrawMeasureEntity(obj, {
                            ...obj.settings,
                            segmentLabelInterval: 10,
                        });
                        if (measureSet.length === 1) {
                            objectToSetMarker = drawProd;
                        }
                        objectDraw.current.set(objId, { product: drawProd, updated: id });
                    }
                }
                if (objectToSetMarker) {
                    for (const obj of objectToSetMarker.objects) {
                        switch (obj.kind) {
                            case "plane":
                                {
                                    const planeObj = obj.parts[obj.parts.length - 1];
                                    const sum = vec3.create();
                                    for (let k = 0; k < planeObj.vertices3D.length - 1; ++k) {
                                        vec3.add(sum, sum, planeObj.vertices3D[k]);
                                    }
                                    const pos3d = vec3.scale(vec3.create(), sum, 1 / (planeObj.vertices3D.length - 1));
                                    if (vec3.dist(pos3d, camera.position) < 100) {
                                        const sp = view.measure?.draw.toMarkerPoints([pos3d]);
                                        if (sp && sp.length > 0 && sp[0]) {
                                            removePos[i] = sp[0];
                                            infoPos[i] = vec2.fromValues(sp[0][0] + 20, sp[0][1]);
                                        } else {
                                            removePos[i] = undefined;
                                        }
                                    }
                                }

                                break;
                            case "cylinder":
                            case "curveSegment":
                            case "edge":
                                if (obj.parts[0].vertices2D) {
                                    const start = obj.parts[0].vertices2D[0];
                                    const end = obj.parts[0].vertices2D[obj.parts[0].vertices2D.length - 1];
                                    const dir = vec2.sub(vec2.create(), end, start);
                                    const dist = vec2.len(dir);
                                    const removeOffset = (dist / 2 + 50) / dist;
                                    const infoOffset = (dist / 2 + 70) / dist;
                                    if (dist > 110) {
                                        removePos[i] = vec2.scaleAndAdd(vec2.create(), start, dir, removeOffset);
                                        infoPos[i] = vec2.scaleAndAdd(vec2.create(), start, dir, infoOffset);
                                    }
                                }
                                break;
                        }
                    }
                } else {
                    removePos[i] = undefined;
                }
            }

            const removeAxis: {
                x?: vec2;
                y?: vec2;
                z?: vec2;
                plan?: vec2;
                dist?: vec2;
            }[] = [];

            for (let i = 0; i < measure.duoMeasurementValues.length; ++i) {
                const duoMeasure = measure.duoMeasurementValues[i];
                const activeAxis = measure.activeAxis[i];
                if (duoMeasure?.result) {
                    let resultToMarker: undefined | DrawProduct;
                    const res = resultDraw.current.get(duoMeasure.id);
                    if (res) {
                        if (res.product) {
                            view.measure.draw.updateProuct(res.product);
                            if (res.updated > id) {
                                return false;
                            }
                            res.updated = id;
                            resultToMarker = res.product;
                            res.activeAxis = activeAxis!;
                        }
                    } else {
                        const resDraw = await getDrawMeasureEntity(duoMeasure?.result);
                        resultDraw.current.set(duoMeasure.id, {
                            product: resDraw,
                            updated: id,
                            activeAxis: activeAxis!,
                        });
                        resultToMarker = resDraw;
                    }
                    if (resultToMarker) {
                        if (resultToMarker.objects.length > 0) {
                            const axisPos: AxisPosition = {};
                            for (const part of resultToMarker.objects[0].parts) {
                                if (part.vertices2D) {
                                    const dir = vec2.sub(vec2.create(), part.vertices2D[1], part.vertices2D[0]);
                                    const dist = vec2.len(dir);
                                    const removeOffset = (dist / 2 + 50) / dist;
                                    const infoOffset = (dist / 2 + 70) / dist;
                                    if (dist > 120) {
                                        switch (part.name) {
                                            case "result":
                                                if (activeAxis!.result) {
                                                    axisPos.dist = vec2.scaleAndAdd(
                                                        vec2.create(),
                                                        part.vertices2D[0],
                                                        dir,
                                                        removeOffset
                                                    );
                                                }
                                                infoPos[i] = vec2.scaleAndAdd(
                                                    vec2.create(),
                                                    part.vertices2D[0],
                                                    dir,
                                                    infoOffset
                                                );
                                                break;
                                            case "xy-plane":
                                                if (activeAxis!.planar) {
                                                    axisPos.plan = vec2.scaleAndAdd(
                                                        vec2.create(),
                                                        part.vertices2D[0],
                                                        dir,
                                                        removeOffset
                                                    );
                                                }
                                                break;
                                            case "x-axis":
                                                if (activeAxis!.x) {
                                                    axisPos.x = vec2.scaleAndAdd(
                                                        vec2.create(),
                                                        part.vertices2D[0],
                                                        dir,
                                                        removeOffset
                                                    );
                                                }
                                                break;
                                            case "y-axis":
                                                if (activeAxis!.y) {
                                                    axisPos.y = vec2.scaleAndAdd(
                                                        vec2.create(),
                                                        part.vertices2D[0],
                                                        dir,
                                                        removeOffset
                                                    );
                                                }
                                                break;
                                            case "z-axis":
                                                if (activeAxis!.z) {
                                                    axisPos.z = vec2.scaleAndAdd(
                                                        vec2.create(),
                                                        part.vertices2D[0],
                                                        dir,
                                                        removeOffset
                                                    );
                                                }
                                                break;
                                            case "normal":
                                                axisPos.normal = vec2.scaleAndAdd(
                                                    vec2.create(),
                                                    part.vertices2D[0],
                                                    dir,
                                                    removeOffset
                                                );
                                                break;
                                        }
                                    }
                                }
                            }
                            removeAxis.push(axisPos);
                        }
                    }
                } else {
                    removeAxis.push({});
                }
            }

            const fillMarkerPositions = (
                removePos: (vec2 | undefined)[],
                finalizePos: (vec2 | undefined)[],
                undoPos: (vec2 | undefined)[],
                points: vec3[],
                index: number,
                isCurrent: (index: number) => boolean
            ) => {
                if (points.length) {
                    const sum = vec3.create();
                    for (let j = 0; j < points.length; ++j) {
                        vec3.add(sum, sum, points[j]);
                    }
                    const pos3d = vec3.scale(vec3.create(), sum, 1 / points.length);
                    if (vec3.dist(pos3d, camera.position) < 100) {
                        const sp = view.measure?.draw.toMarkerPoints([pos3d]);
                        if (sp && sp.length > 0 && sp[0]) {
                            removePos[index] = vec2.fromValues(sp[0][0], sp[0][1] + 20);
                        } else {
                            removePos[index] = undefined;
                        }
                        if (points.length > 2 && isCurrent(index)) {
                            const screenPoints = view.measure?.draw.toMarkerPoints([
                                points[0],
                                points[points.length - 1],
                            ]);
                            if (screenPoints && screenPoints.length > 1) {
                                finalizePos[index] = screenPoints[0];
                                undoPos[index] = screenPoints[1];
                            }
                        }
                    }
                }
            };

            const areaRemovePos: (vec2 | undefined)[] = [];
            const areaFinalizePos: (vec2 | undefined)[] = [];
            const areaUndoPos: (vec2 | undefined)[] = [];
            const isCurrentArea = (index: number) => {
                return areaCurrent === index && picker === Picker.Area;
            };
            for (let i = 0; i < areas.length; ++i) {
                const areaPoints = areas[i].points;
                fillMarkerPositions(areaRemovePos, areaFinalizePos, areaUndoPos, areaPoints, i, isCurrentArea);
            }

            const pointLineRemovePos: (vec2 | undefined)[] = [];
            const pointLineFinalizePos: (vec2 | undefined)[] = [];
            const pointLineUndoPos: (vec2 | undefined)[] = [];
            const isCurrentPointLine = (index: number) => {
                return pointLineCurrent === index && picker === Picker.PointLine;
            };
            for (let i = 0; i < pointLines.length; ++i) {
                const pointLinePoints = pointLines[i].points;
                fillMarkerPositions(
                    pointLineRemovePos,
                    pointLineFinalizePos,
                    pointLineUndoPos,
                    pointLinePoints,
                    i,
                    isCurrentPointLine
                );
            }

            if (id !== updateId.current) {
                return false;
            }
            interactionPositions.current.area.remove = areaRemovePos;
            interactionPositions.current.area.undo = areaUndoPos;
            interactionPositions.current.area.finalize = areaFinalizePos;
            interactionPositions.current.pointLine.remove = pointLineRemovePos;
            interactionPositions.current.pointLine.undo = pointLineUndoPos;
            interactionPositions.current.pointLine.finalize = pointLineFinalizePos;
            interactionPositions.current.remove = removePos;
            interactionPositions.current.info = infoPos;
            interactionPositions.current.removeAxis = removeAxis;
            return true;
        }
        return false;
    }, [
        view,
        measure.duoMeasurementValues,
        measureSets,
        drawSelectedPaths,
        pathMeasureObjectsData,
        heightProfileMeasureObject,
        manhole,
        manholeCollisionEntity,
        drawPathSettings,
        measure.hover,
        measure.pinned,
        interactionPositions,
        measure.activeAxis,
        areas,
        pointLines,
        pointLineCurrent,
        areaCurrent,
        picker,
    ]);

    const draw = useCallback(() => {
        if (context2D && canvas2D && size && view) {
            //removePositions.current = [];
            const { camera } = view.renderState;
            const cameraDirection = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), camera.rotation);
            const camSettings = { pos: camera.position, dir: cameraDirection };

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

            drawMeasureObjects(
                objectDraw.current,
                updateId.current,
                hoverObjectDrawResult.current,
                hoverHideId.current,
                context2D,
                camSettings
            );
            drawDuoResults(resultDraw.current, updateId.current, context2D, camSettings);

            followPathDrawResult.current.forEach(
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

            if (hoverObjectDrawResult.current) {
                drawProduct(
                    context2D,
                    camSettings,
                    hoverObjectDrawResult.current,
                    { lineColor: hoverLineColor, fillColor: hoverFillColor, pointColor: hoverLineColor },
                    5
                );
            }

            if (heightProfileDrawResult.current) {
                drawProduct(
                    context2D,
                    camSettings,
                    heightProfileDrawResult.current,
                    { lineColor: "yellow", fillColor: measurementFillColor },
                    3
                );
            }

            if (manholeDrawResult.current) {
                drawProduct(
                    context2D,
                    camSettings,
                    manholeDrawResult.current,
                    { lineColor: "yellow", fillColor: measurementFillColor },
                    3
                );
            }

            if (manholeCollisionEntityDrawResult.current) {
                drawProduct(
                    context2D,
                    camSettings,
                    manholeCollisionEntityDrawResult.current,
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

            for (const area of areas) {
                const areaPoints = area.drawPoints;
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
                                        customText: [area.area.toFixed(2)],
                                    }
                                );
                            });
                        });
                    }
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
                    if (traceDraw) {
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
            }

            for (const pointLine of pointLines) {
                const { points, result } = pointLine;
                if (points.length && result) {
                    const drawProd = view.measure?.draw.getDrawObjectFromPoints(points, false, true, true);

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
        context2D,
        canvas2D,
        size,
        view,
        areas,
        crossSection,
        cameraType,
        outlineLasers,
        manholeCollisionValues,
        pointLines,
        pointerPos,
        roadCrossSectionData,
        showTracer,
        traceVerical,
        viewMode,
    ]);

    useEffect(() => {
        update().then((r) => {
            if (r) {
                draw();
            }
        });
    }, [update, draw]);

    useEffect(() => {
        setContext2D(canvas2D?.getContext("2d"));
    }, [canvas2D]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);
        async function animate(moved: boolean) {
            if (view) {
                const run = moved || (showTracer && !vec2.exactEquals(prevPointerPos.current, pointerPos.current));
                if (!run) {
                    return;
                }

                prevPointerPos.current = [...pointerPos.current];
                if (await update()) {
                    draw();
                }
            }
        }
    }, [view, update, grid, cameraType, pointerPos, renderFnRef, showTracer, viewMode, draw]);

    return <Canvas2D id="canvas2D" ref={setCanvas2D} width={size.width} height={size.height} />;
}
