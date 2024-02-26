import { DrawModule, DrawProduct } from "@novorender/api";
import { ColorRGBA } from "@novorender/webgl-api";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart, getCameraState } from "features/engine2D";
import { AsyncStatus } from "types/misc";

import {
    FeatureGeometryPoint,
    FeatureGeometryPolygon,
    FeatureGeometryPolyline,
    selectArcgisFeatureServers,
    selectArcgisSelectedFeature,
} from "../arcgisSlice";
import { LayerDrawingInfo, LayerGeometryType } from "../arcgisTypes";
import { useIsCameraSetCorrectly } from "../hooks/useIsCameraSetCorrectly";
import {
    b64toBlob,
    doAabb2Intersect,
    getAabb2MaxSize,
    getOrthoCameraExtent,
    isSuitableCameraForArcgis,
} from "../utils";

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
    const drawObjectCache = useRef(new WeakMap<object, DrawProduct | undefined>());

    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const selectedFeature = useAppSelector(selectArcgisSelectedFeature);
    const isCameraSetCorrectly = useIsCameraSetCorrectly(isSuitableCameraForArcgis);

    useEffect(() => {
        drawObjectCache.current = new WeakMap<object, DrawProduct | undefined>();
    }, [view, ctx, canvas, featureServers, selectedFeature]);

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

                for (let i = 0; i < layer.features.data.length; i++) {
                    const { geometry, attributes, aabb } = layer.features.data[i];
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
                            selectedFeature.featureId === attributes[layer.definition.data.objectIdField]
                    );

                    if ("paths" in geometry) {
                        drawPolyline(drawCtx, geometry, layer.definition.data.drawingInfo, isSelected);
                    } else if ("rings" in geometry) {
                        drawPolygon(drawCtx, geometry, layer.definition.data.drawingInfo, isSelected);
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

                    const { symbol } = layer.definition.data.drawingInfo.renderer;
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
};

function colorRgbaToString(color: ColorRGBA) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
}

function drawPolyline(
    drawCtx: DrawingContext,
    geometry: FeatureGeometryPolyline,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean
) {
    let lineWidth = 1;
    let lineColor = "#83568d";
    const { symbol } = drawingInfo.renderer;
    if (symbol?.type === "esriSLS") {
        lineWidth = symbol.width;
        lineColor = colorRgbaToString(symbol.color);
    }

    if (isSelected) {
        lineWidth = 4;
        lineColor = drawCtx.selectedColor;
    }

    for (const path of geometry.paths) {
        drawCtx.draw.getDrawObjectFromPoints(path, false, false, false)?.objects.forEach((obj) => {
            obj.parts.forEach((part) =>
                drawPart(
                    drawCtx.ctx,
                    drawCtx.cameraState,
                    part,
                    {
                        lineColor,
                    },
                    lineWidth
                )
            );
        });
    }
}

function drawPolygon(
    drawCtx: DrawingContext,
    geometry: FeatureGeometryPolygon,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean
) {
    let lineWidth = 1;
    let lineColor = "#83568d";
    let fillColor = "#59769fbb";
    const { symbol } = drawingInfo.renderer;
    if (symbol?.type === "esriSFS") {
        fillColor = colorRgbaToString(symbol.color);
        if (symbol.outline.type === "esriSLS") {
            lineWidth = symbol.outline.width;
            lineColor = colorRgbaToString(symbol.outline.color);
        }
    }

    if (isSelected) {
        lineColor = drawCtx.selectedColor;
        lineWidth = 4;
    }

    for (const ring of geometry.rings) {
        drawCtx.draw.getDrawObjectFromPoints(ring, true, false, false)?.objects.forEach((obj) => {
            obj.parts.forEach((part) =>
                drawPart(
                    drawCtx.ctx,
                    drawCtx.cameraState,
                    part,
                    {
                        lineColor,
                        fillColor,
                    },
                    lineWidth
                )
            );
        });
    }
}

function drawPoint(
    drawCtx: DrawingContext,
    geometry: FeatureGeometryPoint,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean
) {
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
    } else {
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
                    2
                )
            );
        });
    }
}

function ptToPx(pt: number) {
    return pt / 0.75;
}
