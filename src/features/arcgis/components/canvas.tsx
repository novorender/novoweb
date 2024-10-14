import { DrawModule } from "@novorender/api";
import { ColorRGBA } from "@novorender/webgl-api";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart, getCameraState } from "features/engine2D";
import { type ColorSettings } from "features/engine2D";
import { AsyncStatus } from "types/misc";

import { selectArcgisFeatureServers, selectArcgisSelectedFeature } from "../arcgisSlice";
import { FeatureSymbol, LayerDrawingInfo, LayerGeometryType } from "../arcgisTypes";
import { useIsCameraSetCorrectly } from "../hooks/useIsCameraSetCorrectly";
import { FeatureGeometryPoint, FeatureGeometryPolygon, FeatureGeometryPolyline, LayerFeature } from "../types";
import { b64toBlob, doAabb2Intersect, getAabb2MaxSize, getOrthoCameraExtent } from "../utils";

export function ArcgisCanvas({
    renderFnRef,
}: {
    renderFnRef: MutableRefObject<((moved: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const imageMap = useRef(new Map<string, ImageBitmap>());
    const drawStyleCache = useRef(new WeakMap<FeatureSymbol, DrawStyle>());

    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const selectedFeature = useAppSelector(selectArcgisSelectedFeature);
    const isCameraSetCorrectly = useIsCameraSetCorrectly();

    const draw = useCallback(() => {
        if (!view?.measure || !ctx || !canvas || featureServers.status !== AsyncStatus.Success) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);
        const extent = getOrthoCameraExtent(view.renderState);
        const metersPerPixel = view.renderState.camera.fov / view.renderState.output.height;
        const minRenderableSize = metersPerPixel;

        const drawCtx: DrawingContext = {
            draw: view.measure.draw,
            ctx,
            cameraState,
            selectedColor: "#29B6F6",
            imageMap: imageMap.current,
            drawStyleCache: drawStyleCache.current,
        };

        for (const featureServer of featureServers.data) {
            for (const layer of featureServer.layers) {
                if (
                    layer.definition.status !== AsyncStatus.Success ||
                    layer.features.status !== AsyncStatus.Success ||
                    !layer.checked
                ) {
                    continue;
                }

                for (const feature of layer.features.data) {
                    const { geometry, attributes, aabb } = feature;
                    if (!geometry || !aabb || !doAabb2Intersect(aabb, extent)) {
                        continue;
                    }

                    if (
                        (layer.geometryType === LayerGeometryType.esriGeometryPolygon ||
                            layer.geometryType === LayerGeometryType.esriGeometryPolyline) &&
                        getAabb2MaxSize(aabb) < minRenderableSize
                    ) {
                        continue;
                    }

                    const isSelected = Boolean(
                        selectedFeature &&
                            selectedFeature.featureServerId === featureServer.id &&
                            selectedFeature.layerId === layer.id &&
                            selectedFeature.featureId === attributes[layer.definition.data.objectIdField],
                    );

                    if ("paths" in geometry) {
                        drawPolyline(drawCtx, feature, geometry, layer.definition.data.drawingInfo, isSelected);
                    } else if ("rings" in geometry) {
                        drawPolygon(drawCtx, feature, geometry, layer.definition.data.drawingInfo, isSelected);
                    } else {
                        drawPoint(drawCtx, geometry, layer.definition.data.drawingInfo, isSelected);
                    }
                }
            }
        }
    }, [view, ctx, canvas, featureServers, selectedFeature]);

    const buildImages = useCallback(async () => {
        buildImages();

        async function buildImages() {
            if (featureServers.status !== AsyncStatus.Success) {
                return;
            }

            const promises: Promise<unknown>[] = [];
            const imageDataSet = new Set<string>();
            for (const fs of featureServers.data) {
                for (const layer of fs.layers) {
                    if (layer.definition.status !== AsyncStatus.Success) {
                        continue;
                    }

                    const { renderer } = layer.definition.data.drawingInfo;
                    if (renderer.type === "simple") {
                        const { symbol } = renderer;

                        if (symbol?.type === "esriPMS" && symbol.imageData) {
                            if (!imageMap.current.has(symbol.imageData) || !imageDataSet.has(symbol.imageData)) {
                                const promise = createImageBitmap(b64toBlob(symbol.imageData), {
                                    resizeWidth: ptToPx(symbol.width),
                                    resizeHeight: ptToPx(symbol.height),
                                }).then((image) => imageMap.current.set(symbol.imageData, image));
                                promises.push(promise);
                            }

                            imageDataSet.add(symbol.imageData);
                        }
                    }
                }
            }

            imageMap.current.forEach((value, key) => {
                if (!imageDataSet.has(key)) {
                    value.close();
                    imageMap.current.delete(key);
                }
            });

            await Promise.all(promises);
        }
    }, [featureServers]);

    useEffect(() => {
        let aborted = false;
        go();

        async function go() {
            await buildImages();
            if (!aborted) {
                draw();
            }
        }

        return () => {
            aborted = true;
        };
    }, [draw, buildImages, size]);

    useEffect(() => {
        const { current } = imageMap;
        return () => {
            for (const bmp of current.values()) {
                bmp.close();
            }
        };
    }, []);

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

    const canDraw =
        view &&
        isCameraSetCorrectly &&
        featureServers.status === AsyncStatus.Success &&
        featureServers.data.some((fs) => fs.layers.some((l) => l.checked && l.aabb));

    return (
        <>
            {canDraw && (
                <Canvas2D
                    id="point-line-canvas"
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

type DrawingContext = {
    draw: DrawModule;
    ctx: CanvasRenderingContext2D;
    cameraState: CameraState;
    selectedColor: string;
    imageMap: Map<string, ImageBitmap>;
    drawStyleCache: WeakMap<FeatureSymbol, DrawStyle>;
};

function colorRgbaToString(color: ColorRGBA) {
    return `rgba(${color[0]} ${color[1]} ${color[2]} / ${color[3] / 255})`;
}

type DrawStyle = {
    colorSettings: ColorSettings;
    pixelWidth?: number;
};

function getDrawStyleForSymbol(drawCtx: DrawingContext, symbol: FeatureSymbol): DrawStyle | undefined {
    let result = drawCtx.drawStyleCache.get(symbol);
    if (result) {
        return result;
    }

    if (symbol.type === "esriSFS") {
        if (symbol.style === "esriSFSSolid") {
            result = {
                colorSettings: {
                    lineColor: colorRgbaToString(symbol.outline.color),
                    fillColor: colorRgbaToString(symbol.color),
                },
                pixelWidth: symbol.outline.width,
            };
        } else if (symbol.style === "esriSFSBackwardDiagonal") {
            const pattern = createPattern(drawCtx.ctx, (patternCanvas, patternCtx) => {
                patternCanvas.width = 50;
                patternCanvas.height = 50;

                patternCtx.strokeStyle = colorRgbaToString(symbol.color);
                patternCtx.lineWidth = symbol.outline?.width ?? 1;
                const offset = 2;
                for (let i = 1; i <= 5; i++) {
                    patternCtx.moveTo(10 * i + offset, -offset);
                    patternCtx.lineTo(-offset, 10 * i + offset);
                    patternCtx.moveTo(50 + offset, 10 * i - offset);
                    patternCtx.lineTo(10 * i - offset, 50 + offset);
                }
                patternCtx.stroke();
            });

            result = {
                colorSettings: {
                    fillColor: pattern,
                },
            };
        } else if (symbol.style === "esriSFSForwardDiagonal") {
            const pattern = createPattern(drawCtx.ctx, (patternCanvas, patternCtx) => {
                patternCanvas.width = 50;
                patternCanvas.height = 50;

                patternCtx.strokeStyle = colorRgbaToString(symbol.color);
                patternCtx.lineWidth = symbol.outline?.width ?? 1;
                const offset = 2;
                for (let i = 1; i <= 5; i++) {
                    patternCtx.moveTo(10 * i - offset, -offset);
                    patternCtx.lineTo(50 + offset, 50 - 10 * i + offset);
                    patternCtx.moveTo(-offset, 10 * i - offset);
                    patternCtx.lineTo(50 - 10 * i + offset, 50 + offset);
                }
                patternCtx.stroke();
            });

            result = {
                colorSettings: {
                    fillColor: pattern,
                },
            };
        } else if (symbol.style === "esriSFSDiagonalCross") {
            const pattern = createPattern(drawCtx.ctx, (patternCanvas, patternCtx) => {
                patternCanvas.width = 10;
                patternCanvas.height = 10;

                patternCtx.strokeStyle = colorRgbaToString(symbol.color);
                patternCtx.lineWidth = symbol.outline?.width ?? 1;
                patternCtx.moveTo(-2, -2);
                patternCtx.lineTo(12, 12);
                patternCtx.moveTo(12, -2);
                patternCtx.lineTo(-2, 12);
                patternCtx.stroke();
            });

            result = {
                colorSettings: {
                    fillColor: pattern,
                },
            };
        }
    } else if (symbol.type === "esriSLS") {
        const lineColor = colorRgbaToString(symbol.color);
        if (symbol.style === "esriSLSSolid") {
            result = {
                colorSettings: {
                    lineColor,
                },
                pixelWidth: symbol.width,
            };
        } else if (symbol.style === "esriSLSDash") {
            result = {
                colorSettings: {
                    lineColor,
                    lineDash: [5, 5],
                },
                pixelWidth: symbol.width,
            };
        } else if (symbol.style === "esriSLSDashDot") {
            result = {
                colorSettings: {
                    lineColor,
                    lineDash: [5, 5, 2, 5],
                },
                pixelWidth: symbol.width,
            };
        }
    }

    if (result) {
        drawCtx.drawStyleCache.set(symbol, result);
    }
    return result;
}

function createPattern(
    baseCtx: CanvasRenderingContext2D,
    produce: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void,
) {
    const patternCanvas = document.createElement("canvas");
    try {
        const patternCtx = patternCanvas.getContext("2d")!;
        produce(patternCanvas, patternCtx);
        return baseCtx.createPattern(patternCanvas, "repeat")!;
    } finally {
        patternCanvas.remove();
    }
}

const SELECTED_POLYGON_COLOR_SETTINGS: ColorSettings = {
    lineColor: "#29B6F6bb",
    fillColor: "#29B6F677",
};

const SELECTED_POLYLINE_COLOR_SETTINGS: ColorSettings = {
    lineColor: "#29B6F6bb",
    fillColor: "#29B6F677",
};

function drawPolygon(
    drawCtx: DrawingContext,
    feature: LayerFeature,
    geometry: FeatureGeometryPolygon,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean,
) {
    if (!feature.computedSymbol) {
        return;
    }

    const drawStyle = getDrawStyleForSymbol(drawCtx, feature.computedSymbol);

    if (!drawStyle) {
        return;
    }

    const { colorSettings, pixelWidth = 2 } = drawStyle;

    for (const ring of geometry.rings) {
        drawCtx.draw
            .getDrawObjectFromPoints(ring, { closed: true, angles: false, generateLineLabels: false })
            ?.objects.forEach((obj) => {
                obj.parts.forEach((part) => {
                    drawPart(drawCtx.ctx, drawCtx.cameraState, part, colorSettings, pixelWidth);

                    if (isSelected) {
                        drawPart(drawCtx.ctx, drawCtx.cameraState, part, SELECTED_POLYGON_COLOR_SETTINGS, 2);
                    }
                });
            });
    }
}

function drawPolyline(
    drawCtx: DrawingContext,
    feature: LayerFeature,
    geometry: FeatureGeometryPolyline,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean,
) {
    if (!feature.computedSymbol) {
        return;
    }

    const drawStyle = getDrawStyleForSymbol(drawCtx, feature.computedSymbol);

    if (!drawStyle) {
        return;
    }

    const { colorSettings, pixelWidth = 2 } = drawStyle;

    for (const path of geometry.paths) {
        drawCtx.draw
            .getDrawObjectFromPoints(path, { closed: false, angles: false, generateLineLabels: false })
            ?.objects.forEach((obj) => {
                obj.parts.forEach((part) => {
                    drawPart(drawCtx.ctx, drawCtx.cameraState, part, colorSettings, pixelWidth);

                    if (isSelected) {
                        drawPart(
                            drawCtx.ctx,
                            drawCtx.cameraState,
                            part,
                            SELECTED_POLYLINE_COLOR_SETTINGS,
                            pixelWidth + 2,
                        );
                    }
                });
            });
    }
}

function drawPoint(
    drawCtx: DrawingContext,
    geometry: FeatureGeometryPoint,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean,
) {
    if (drawingInfo.renderer.type === "simple") {
        const { symbol } = drawingInfo.renderer;

        if (symbol?.type === "esriPMS") {
            const image = drawCtx.imageMap.get(symbol.imageData)!;
            if (!image) {
                return;
            }

            const { ctx } = drawCtx;
            drawCtx.draw.getDrawObjectFromPoints([[geometry.x, geometry.y, geometry.z]])?.objects.forEach((obj) => {
                obj.parts.forEach((part) => {
                    const point = part.vertices2D![0];
                    const hw = ptToPx(symbol.width) / 2;
                    const hh = ptToPx(symbol.height) / 2;

                    if (isSelected) {
                        ctx.fillStyle = drawCtx.selectedColor;
                        ctx.beginPath();
                        ctx.arc(point[0], point[1], Math.max(hw, hh), 0, 2 * Math.PI);
                        ctx.fill();
                    }

                    const dx = point[0] - hw;
                    const dy = point[1] - hh;
                    ctx.drawImage(image, dx, dy);
                });
            });

            return;
        }
    }

    let pointColor = "red";

    if (isSelected) {
        pointColor = drawCtx.selectedColor;
    }

    drawCtx.draw.getDrawObjectFromPoints([[geometry.x, geometry.y, geometry.z]])?.objects.forEach((obj) => {
        obj.parts.forEach((part) =>
            drawPart(
                drawCtx.ctx,
                drawCtx.cameraState,
                part,
                {
                    pointColor,
                },
                2,
            ),
        );
    });
}

function ptToPx(pt: number) {
    return pt / 0.75;
}
