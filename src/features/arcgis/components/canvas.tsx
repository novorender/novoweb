import { IPoint, IPolygon, IPolyline } from "@esri/arcgis-rest-request";
import { DrawModule } from "@novorender/api";
import { ColorRGBA } from "@novorender/webgl-api";
import { ReadonlyVec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app/store";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart, getCameraState } from "features/engine2D";
import { AsyncStatus } from "types/misc";

import { selectArcgisFeatureServers, selectArcgisSelectedFeature } from "../arcgisSlice";
import { LayerDrawingInfo } from "../arcgisTypes";
import { useIsCameraSetCorrectly } from "../hooks/useIsCameraSetCorrectly";
import { isSuitableCameraForArcgis } from "../utils";

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

    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const selectedFeature = useAppSelector(selectArcgisSelectedFeature);
    const isCameraSetCorrectly = useIsCameraSetCorrectly(isSuitableCameraForArcgis);

    const draw = useCallback(() => {
        if (!view?.measure || !ctx || !canvas || featureServers.status !== AsyncStatus.Success) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);

        const drawCtx: DrawingContext = {
            draw: view.measure.draw,
            ctx,
            cameraState,
            selectedStrokeColor: "#29B6F6",
        };

        for (const featureServer of featureServers.data) {
            for (const layer of featureServer.layers) {
                if (
                    layer.details.status !== AsyncStatus.Success ||
                    layer.features.status !== AsyncStatus.Success ||
                    !layer.checked
                ) {
                    continue;
                }

                for (let i = 0; i < layer.features.data.features.length; i++) {
                    const geometry = layer.features.data.features[i].geometry;
                    if (!geometry) {
                        continue;
                    }

                    const isSelected = Boolean(
                        selectedFeature &&
                            selectedFeature.featureServerId === featureServer.id &&
                            selectedFeature.layerId === layer.id &&
                            selectedFeature.featureIndex === i
                    );

                    if ("paths" in geometry) {
                        drawPolyline(drawCtx, geometry, layer.details.data.drawingInfo, isSelected);
                    } else if ("curvePaths" in geometry) {
                        // polyline with curves
                    } else if ("rings" in geometry) {
                        drawPolygon(drawCtx, geometry, layer.details.data.drawingInfo, isSelected);
                    } else if ("curveRings" in geometry) {
                        // polygon with curves
                    } else {
                        drawPoint(drawCtx, geometry, layer.details.data.drawingInfo, isSelected);
                    }
                }
            }
        }
    }, [view, ctx, canvas, featureServers, selectedFeature]);

    useEffect(() => {
        draw();
    }, [draw, size]);

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
    selectedStrokeColor: string;
};

function colorRgbaToString(color: ColorRGBA) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
}

function drawPolyline(
    drawCtx: DrawingContext,
    geometry: IPolyline,
    drawingInfo: LayerDrawingInfo,
    isSelected: boolean
) {
    let lineWidth = 1;
    let lineColor = "#83568d";
    const { symbol } = drawingInfo.renderer;
    if (symbol.type === "esriSLS") {
        lineWidth = symbol.width;
        lineColor = colorRgbaToString(symbol.color);
    }

    if (isSelected) {
        lineWidth = 4;
        lineColor = drawCtx.selectedStrokeColor;
    }

    for (const segment of geometry.paths) {
        const pts = segment.map((points) => [points[0], points[1], 0] as ReadonlyVec3);
        drawCtx.draw.getDrawObjectFromPoints(pts, false, false, false)?.objects.forEach((obj) => {
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

function drawPolygon(drawCtx: DrawingContext, geometry: IPolygon, drawingInfo: LayerDrawingInfo, isSelected: boolean) {
    let lineWidth = 1;
    let lineColor = "#83568d";
    let fillColor = "#59769fbb";
    const { symbol } = drawingInfo.renderer;
    if (symbol.type === "esriSFS") {
        fillColor = colorRgbaToString(symbol.color);
        if (symbol.outline.type === "esriSLS") {
            lineWidth = symbol.outline.width;
            lineColor = colorRgbaToString(symbol.outline.color);
        }
    }

    if (isSelected) {
        lineColor = drawCtx.selectedStrokeColor;
        lineWidth = 4;
    }

    for (const segment of geometry.rings) {
        const pts = segment.map((points) => [points[0], points[1], 0] as ReadonlyVec3);
        drawCtx.draw.getDrawObjectFromPoints(pts, true, false, false)?.objects.forEach((obj) => {
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

function drawPoint(drawCtx: DrawingContext, geometry: IPoint, drawingInfo: LayerDrawingInfo, isSelected: boolean) {
    let pointColor = "red";
    const { symbol } = drawingInfo.renderer;
    if (symbol.type === "esriPMS") {
        // pointColor = colorRgbaToString(symbol.color);
    }

    if (isSelected) {
        pointColor = drawCtx.selectedStrokeColor;
    }

    const p = geometry;
    drawCtx.draw.getDrawObjectFromPoints([[p.x, p.y, 0]])?.objects.forEach((obj) => {
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
