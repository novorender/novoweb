import { ReadonlyVec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { useAppSelector } from "app/store";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { drawPart, getCameraState } from "features/engine2D";
import { AsyncStatus } from "types/misc";

import { selectArcgisFeatureServers, selectArcgisSelectedFeature } from "../arcgisSlice";
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

        const selectedStrokeColor = "#29B6F6";

        for (const featureServer of featureServers.data) {
            for (const layer of featureServer.layers) {
                if (layer.details.status !== AsyncStatus.Success || !layer.checked) {
                    continue;
                }

                for (let i = 0; i < layer.details.data.features.length; i++) {
                    const geometry = layer.details.data.features[i].geometry;
                    if (!geometry) {
                        continue;
                    }

                    const isSelected =
                        selectedFeature &&
                        selectedFeature.featureServerId === featureServer.config.id &&
                        selectedFeature.layerId === layer.meta.id &&
                        selectedFeature.featureIndex === i;

                    const strokeWidth = isSelected ? 4 : 2;

                    if ("paths" in geometry) {
                        // poliline
                        for (const segment of geometry.paths) {
                            const pts = segment.map((points) => [points[0], points[1], 0] as ReadonlyVec3);
                            view.measure?.draw
                                .getDrawObjectFromPoints(pts, false, false, false)
                                ?.objects.forEach((obj) => {
                                    obj.parts.forEach((part) =>
                                        drawPart(
                                            ctx,
                                            cameraState,
                                            part,
                                            {
                                                lineColor: isSelected ? selectedStrokeColor : "#83568d",
                                            },
                                            strokeWidth
                                        )
                                    );
                                });
                        }
                    } else if ("curvePaths" in geometry) {
                        // polyline with curves
                    } else if ("rings" in geometry) {
                        // polygon
                        for (const segment of geometry.rings) {
                            const pts = segment.map((points) => [points[0], points[1], 0] as ReadonlyVec3);
                            view.measure?.draw
                                .getDrawObjectFromPoints(pts, true, false, false)
                                ?.objects.forEach((obj) => {
                                    obj.parts.forEach((part) =>
                                        drawPart(
                                            ctx,
                                            cameraState,
                                            part,
                                            {
                                                lineColor: isSelected ? selectedStrokeColor : "#2f3c51",
                                                fillColor: "#59769fbb",
                                            },
                                            strokeWidth
                                        )
                                    );
                                });
                        }
                    } else if ("curveRings" in geometry) {
                        // polygon with curves
                    } else {
                        // point
                        const p = geometry;
                        view.measure?.draw.getDrawObjectFromPoints([[p.x, p.y, 0]])?.objects.forEach((obj) => {
                            obj.parts.forEach((part) =>
                                drawPart(
                                    ctx,
                                    cameraState,
                                    part,
                                    {
                                        pointColor: {
                                            start: isSelected ? selectedStrokeColor : "red",
                                            middle: "white",
                                            end: "blue",
                                        },
                                        displayAllPoints: true,
                                    },
                                    2
                                )
                            );
                        });
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
