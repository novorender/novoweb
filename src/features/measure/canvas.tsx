import { DrawableEntity, DrawProduct, MeasureSettings, View } from "@novorender/api";
import { ReadonlyVec2, vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart, drawProduct, getCameraState, vec3Sum } from "features/engine2D";
import { ExtendedMeasureEntity } from "types/misc";

import { MeasureInteractionPositions } from "./measureInteractions";
import { ActiveAxis, selectMeasure } from "./measureSlice";
import { useMeasureObjects } from "./useMeasureObjects";
import { useMove2DInteractions } from "./useMove2DInteractions";

const colors = {
    fill: "rgba(0, 191, 255, 0.15)",
    point: "rgba(0, 191, 255, 0.75)",
    line: "rgba(255, 255, 0, 1)",
};

type RemoveAxisMap = Map<"x" | "y" | "z" | "plan" | "dist" | "normal", vec2>;

export function MeasureCanvas({
    renderFnRef,
    svg,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const {
        state: { size, view },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const measureSets = useMeasureObjects();
    const measure = useAppSelector(selectMeasure);

    const interactionPositions = useRef<MeasureInteractionPositions>({
        remove: [],
        removeAxis: [],
        info: [],
    });
    const moveInteractionMarkers = useMove2DInteractions(svg, interactionPositions);

    const drawProductCacheRef = useRef(new Map<string, DrawProduct | undefined>());
    const resultsDrawProductCacheRef = useRef(
        new Map<number, { product: DrawProduct | undefined; activeAxis: ActiveAxis }>()
    );

    const updateId = useRef(0);
    const update = useCallback(async () => {
        if (!view?.measure || !ctx || !canvas) {
            return false;
        }

        const id = ++updateId.current;
        const drawProductCache = new Map<string, DrawProduct | undefined>();
        const resultsDrawProductCache = new Map<number, { product: DrawProduct | undefined; activeAxis: ActiveAxis }>();
        const [updatedSets, updatedResults] = await Promise.all([
            Promise.all(
                measureSets.map(async (set) =>
                    Promise.all(
                        set.map(async (obj) => {
                            if (obj.drawKind === "vertex") {
                                const product = await getDrawMeasureEntity(view, obj);
                                drawProductCache.set("-1", product);
                                return product;
                            }

                            const objId = toId(obj);
                            const cached = drawProductCacheRef.current.get(objId);

                            if (cached) {
                                view.measure?.draw.updateProduct(cached);
                                drawProductCache.set(objId, cached);
                                return cached;
                            } else if (!cached) {
                                const product = await getDrawMeasureEntity(view, obj, {
                                    ...obj.settings,
                                    segmentLabelInterval: 10,
                                });
                                drawProductCache.set(objId, product);
                                return product;
                            }
                        })
                    )
                )
            ),
            Promise.all(
                measure.duoMeasurementValues.map(async (measurement, i) => {
                    const activeAxis = measure.activeAxis[i];

                    if (!activeAxis || !measurement?.result) {
                        return;
                    }

                    const cached = resultsDrawProductCacheRef.current.get(measurement.id);
                    if (cached && cached.product) {
                        view.measure?.draw.updateProduct(cached.product);
                        cached.activeAxis = activeAxis;
                        resultsDrawProductCache.set(measurement.id, {
                            product: cached.product,
                            activeAxis: cached.activeAxis,
                        });
                        return { product: cached.product, activeAxis };
                    } else if (!cached) {
                        const product = await getDrawMeasureEntity(view, measurement.result, measurement.settings);
                        resultsDrawProductCache.set(measurement.id, {
                            product,
                            activeAxis,
                        });
                        return { product, activeAxis };
                    }
                })
            ),
        ]);

        if (id !== updateId.current) {
            return false;
        }

        drawProductCacheRef.current = drawProductCache;
        resultsDrawProductCacheRef.current = resultsDrawProductCache;

        const removePos: (vec2 | undefined)[] = [];
        const infoPos: (vec2 | undefined)[] = [];
        updatedSets.forEach((_set, i) => {
            const set = _set.filter((prod): prod is DrawProduct => prod !== undefined);
            const attachInteractions = set.length === 1 && set[0];

            if (!attachInteractions) {
                return;
            }

            attachInteractions.objects.forEach(function setInteractionPositions({ kind, parts }) {
                switch (kind) {
                    case "plane": {
                        const obj = parts.at(-1);

                        if (!obj) {
                            return;
                        }

                        const sum = vec3Sum(obj.vertices3D.slice(0, obj.vertices3D.length - 1));
                        const pos3d = vec3.scale(vec3.create(), sum, 1 / (obj.vertices3D.length - 1));
                        if (vec3.dist(pos3d, view.renderState.camera.position) > 100) {
                            return;
                        }

                        const sp = view.measure?.draw.toMarkerPoints([pos3d]);
                        if (sp && sp.length > 0 && sp[0]) {
                            removePos[i] = sp[0];
                            infoPos[i] = vec2.fromValues(sp[0][0] + 25, sp[0][1]);
                        } else {
                            removePos[i] = undefined;
                        }

                        return;
                    }
                    case "cylinder":
                    case "curveSegment":
                    case "edge": {
                        const vertices2D = parts[0] && parts[0].vertices2D;

                        if (!vertices2D) {
                            return;
                        }

                        const [start, end] =
                            vertices2D[0][0] > vertices2D[vertices2D.length - 1][0]
                                ? [vertices2D[0], vertices2D[vertices2D.length - 1], 1, -1]
                                : [vertices2D[vertices2D.length - 1], vertices2D[0], 1, 1];

                        const dir = vec2.sub(vec2.create(), end, start);
                        const dist = vec2.len(dir);
                        const offset = vec2.fromValues((dir[1] / dist) * 20, (-dir[0] / dist) * 20);
                        if (dist > 110) {
                            removePos[i] = vec2.add(
                                vec2.create(),
                                vec2.scaleAndAdd(vec2.create(), start, dir, 0.5),
                                offset
                            );
                            infoPos[i] = vec2.add(
                                vec2.create(),
                                vec2.scaleAndAdd(vec2.create(), start, dir, (dist / 2 + 25) / dist),
                                offset
                            );
                        }

                        return;
                    }
                    case "vertex": {
                        const pt = parts[0] && parts[0].vertices2D && parts[0].vertices2D[0];

                        if (pt) {
                            removePos[i] = vec2.fromValues(pt[0] + 25, pt[1]);
                        }

                        return;
                    }
                    default:
                        return;
                }
            });
        });

        const removeAxis: typeof interactionPositions.current.removeAxis = [];
        updatedResults.forEach((result, i) => {
            if (!result?.activeAxis || !result.product || !result.product.objects[0]) {
                return;
            }

            const activeAxis = result.activeAxis;
            const axes = result.product.objects[0].parts.reduce(
                (axes, { vertices2D, name }) => {
                    if (!vertices2D || vertices2D.length < 2) {
                        return axes;
                    }

                    const dir = vec2.sub(vec2.create(), vertices2D[1], vertices2D[0]);
                    const dist = vec2.len(dir) || 1;
                    const axis = dist > 120 ? axes.long : !axes.short.size ? axes.short : undefined;

                    if (!axis) {
                        return axes;
                    }

                    if (axis === axes.short) {
                        axis.clear();
                    }

                    const removeOffset = (dist / 2 + 55) / dist;
                    const infoOffset = (dist / 2 + 80) / dist;

                    switch (name) {
                        case "result": {
                            if (activeAxis.result) {
                                axis.set("dist", vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, removeOffset));
                            }
                            infoPos[i] = vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, infoOffset);
                            break;
                        }
                        case "xy-plane": {
                            if (activeAxis.planar) {
                                axis.set("plan", vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, removeOffset));
                            }
                            break;
                        }
                        case "x-axis": {
                            if (activeAxis.x) {
                                axis.set("x", vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, removeOffset));
                            }
                            break;
                        }
                        case "y-axis": {
                            if (activeAxis.y) {
                                axis.set("y", vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, removeOffset));
                            }
                            break;
                        }
                        case "z-axis": {
                            if (activeAxis.z) {
                                axis.set("z", vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, removeOffset));
                            }
                            break;
                        }
                        case "normal": {
                            axis.set("normal", vec2.scaleAndAdd(vec2.create(), vertices2D[0], dir, removeOffset));
                        }
                    }

                    return axes;
                },
                { long: new Map() as RemoveAxisMap, short: new Map() as RemoveAxisMap }
            );

            removeAxis.push(Object.fromEntries(axes.long.size ? axes.long : axes.short));
        });

        interactionPositions.current.remove = removePos;
        interactionPositions.current.info = infoPos;
        interactionPositions.current.removeAxis = removeAxis;

        return true;
    }, [view, canvas, ctx, measure.duoMeasurementValues, measureSets, interactionPositions, measure.activeAxis]);

    const draw = useCallback(() => {
        if (ctx && canvas && size && view) {
            const cameraState = getCameraState(view.renderState.camera);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drawMeasureObjects(drawProductCacheRef.current, ctx, cameraState);
            drawDuoResults(resultsDrawProductCacheRef.current, ctx, cameraState);
        }
    }, [ctx, canvas, size, view]);

    useEffect(() => {
        update().then((updated) => {
            if (updated) {
                draw();
                moveInteractionMarkers();
            }
        });
    }, [update, draw, moveInteractionMarkers]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);
        async function animate(moved: boolean): Promise<void> {
            if (!view || !moved) {
                return;
            }

            const updated = await update();
            if (updated) {
                draw();
                moveInteractionMarkers();
            }
        }
    }, [draw, moveInteractionMarkers, renderFnRef, update, view]);

    const canDraw = measureSets.some((set) => set.length);
    return (
        canDraw && (
            <Canvas2D
                id="measure-canvas"
                data-include-snapshot
                ref={(el) => {
                    setCanvas(el);
                    setCtx(el?.getContext("2d") ?? null);
                }}
                width={size.width}
                height={size.height}
                sx={{ opacity: measure.hover ? 0.5 : 1 }}
            />
        )
    );
}

function toId(obj: ExtendedMeasureEntity) {
    return `${obj.ObjectId}_${obj.instanceIndex}_${obj.pathIndex}_${obj.settings?.cylinderMeasure}`;
}

async function getDrawMeasureEntity(view: View, entity?: DrawableEntity, settings?: MeasureSettings) {
    return entity && view.measure?.draw.getDrawEntity(entity, settings);
}

function drawMeasureObjects(
    products: Map<string, DrawProduct | undefined>,
    context2D: CanvasRenderingContext2D,
    camSettings: CameraState
) {
    products.forEach((product) => {
        if (product) {
            drawProduct(
                context2D,
                camSettings,
                product,
                {
                    lineColor: colors.line,
                    fillColor: colors.fill,
                    pointColor: colors.point,
                    complexCylinder: true,
                },
                3,
                { type: "default" }
            );
        }
    });
}

function drawDuoResults(
    resultDraw: Map<number, { product: DrawProduct | undefined; activeAxis: ActiveAxis }>,
    context2D: CanvasRenderingContext2D,
    camSettings: CameraState
) {
    for (const [_id, { product, activeAxis }] of resultDraw) {
        if (product && product.objects.length === 1) {
            const obj = product.objects[0];
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
                        if (activeAxis.result) {
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
                        if (activeAxis.x) {
                            drawPart(context2D, camSettings, part, { lineColor: "red" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "y-axis":
                        if (activeAxis.y) {
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "z-axis":
                        if (activeAxis.z) {
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "xy-plane":
                        if (activeAxis.planar) {
                            drawPart(context2D, camSettings, part, { lineColor: "purple" }, 3, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "z-angle":
                        if (activeAxis.z && activeAxis.result) {
                            drawPart(context2D, camSettings, part, { lineColor: "green" }, 2, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "x-angle":
                        if (activeAxis.x && activeAxis.result) {
                            drawPart(context2D, camSettings, part, { lineColor: "red" }, 2, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "y-angle":
                        if (activeAxis.y && activeAxis.result) {
                            drawPart(context2D, camSettings, part, { lineColor: "blue" }, 2, {
                                type: "centerOfLine",
                            });
                        }
                        break;
                    case "xz-angle":
                        if (activeAxis.x && activeAxis.z) {
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
}
