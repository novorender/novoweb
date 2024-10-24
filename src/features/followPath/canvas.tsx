import { DrawProduct } from "@novorender/api";
import { vec2, vec3 } from "gl-matrix";
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Canvas2D } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { deviationsActions } from "features/deviations/deviationsSlice";
import { useIsTopDownOrthoCamera } from "features/deviations/hooks/useIsTopDownOrthoCamera";
import {
    drawLineStrip,
    drawPart,
    drawPoint,
    drawProduct,
    drawTexts,
    getCameraState,
    measurementFillColor,
    translateInteraction,
} from "features/engine2D";
import { CameraType, selectCameraType, selectClippingPlanes, selectMainObject, selectViewMode } from "features/render";
import { selectWidgets } from "slices/explorer";
import { AsyncStatus, ViewMode } from "types/misc";
import { vecToHex } from "utils/color";
import { sleep } from "utils/time";

import {
    followPathActions,
    selectCurrentCenter,
    selectDrawSelectedPositions,
    selectFollowCylindersFrom,
    selectFollowDeviations,
    selectFollowObject,
    selectProfile,
    selectShowTracer,
    selectView2d,
} from "./followPathSlice";
import { useIsCameraAlignedWithClippingPlane } from "./hooks/useIsCameraAlignedWithClippingPlane";
import { useCrossSection } from "./useCrossSection";
import { usePathMeasureObjects } from "./usePathMeasureObjects";

export function FollowPathCanvas({
    renderFnRef,
    pointerPosRef,
    svg,
}: {
    pointerPosRef: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<((moved: boolean, idleFrame: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const {
        state: { view, size },
    } = useExplorerGlobals();
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [tracerCtx, setTracerCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [selectedEntityCtx, setSelectedEntityCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [profileCtx, setProfileCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [deviationsCtx, setDeviationsCtx] = useState<CanvasRenderingContext2D | null>(null);
    const dispatch = useAppDispatch();

    const followProfile = useAppSelector(selectProfile);
    const hidden = useHidden();
    const mainObj = useAppSelector(selectMainObject);
    const viewMode = useAppSelector(selectViewMode);
    const cameraType = useAppSelector(selectCameraType);
    const isTopDownOrtho = useIsTopDownOrthoCamera();
    const view2d = useAppSelector(selectView2d);
    const isCameraAlignedWithClippingPlane = useIsCameraAlignedWithClippingPlane(0);

    const roadFilter = useCrossSection();
    const drawObjectsRef = useRef<DrawProduct[] | null>(null);
    const roadCrossSectionData = roadFilter.status === AsyncStatus.Success ? roadFilter.data : undefined;

    const showTracer = useAppSelector(selectShowTracer);
    const prevPointerPosRef = useRef<Vec2>([0, 0]);

    const selectedEntities = usePathMeasureObjects();
    const selectedEntitiesData = selectedEntities.status === AsyncStatus.Success ? selectedEntities.data : undefined;
    const drawSelectedEntities = useAppSelector(selectDrawSelectedPositions);
    const followCylindersFrom = useAppSelector(selectFollowCylindersFrom);

    const currentProfileCenter = useAppSelector(selectCurrentCenter);
    const currentProfile = useAppSelector(selectProfile);

    const followDeviations = useAppSelector(selectFollowDeviations);
    const fpObj = useAppSelector(selectFollowObject);
    const widgets = useAppSelector(selectWidgets);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const plane = clippingPlanes.planes?.[0];

    const isFollowPathVisible = useMemo(() => widgets.includes("followPath"), [widgets]);
    useEffect(() => {
        async function resetDraw() {
            await sleep(0);
            if (drawObjectsRef.current) {
                drawObjectsRef.current = null;
                dispatch(followPathActions.setHasTracer2dDrawProducts(false));
            }
        }
        resetDraw();
    }, [followProfile, hidden, mainObj, plane, dispatch]);

    const drawCrossSection = useCallback(() => {
        if (!view?.measure || !ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!roadCrossSectionData || !(viewMode === ViewMode.FollowPath || viewMode === ViewMode.Deviations)) {
            return;
        }

        if (!drawObjectsRef.current) {
            return;
        }

        const pixelWidth = 2;

        const textSettings = {
            type: "default" as const,
            unit: "m",
        };

        const colorSettings = {
            lineColor: "#FFFFFF",
            pointColor: "#FFFFFF",
            fillColor: "#FFFFFF",
        };

        for (const product of drawObjectsRef.current) {
            view.measure.draw.updateProduct(product);
            const cameraState = getCameraState(view.renderState.camera);
            for (const object of product.objects) {
                for (const part of object.parts) {
                    drawPart(ctx, cameraState, part, colorSettings, pixelWidth, textSettings);
                }
            }
        }
    }, [view, ctx, canvas, roadCrossSectionData, viewMode]);

    const drawTracer = useCallback(() => {
        if (!view || !tracerCtx || !canvas || !view2d || !isCameraAlignedWithClippingPlane) {
            return;
        }

        tracerCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (!drawObjectsRef.current || drawObjectsRef.current.length <= 1) {
            return;
        }

        const line = {
            start: vec2.fromValues(pointerPosRef.current[0], size.height),
            end: vec2.fromValues(pointerPosRef.current[0], 0),
        };

        const cameraState = getCameraState(view.renderState.camera);
        let skipPoints = showTracer === "normal";
        view.measure?.draw
            .getTraceDrawOject(
                drawObjectsRef.current,
                line,
                showTracer === "vertical" ? undefined : pointerPosRef.current,
            )
            ?.objects.forEach((obj) =>
                obj.parts.forEach((part) => {
                    drawPart(
                        tracerCtx,
                        cameraState,
                        part,
                        {
                            lineColor: "black",
                            displayAllPoints: !skipPoints,
                        },
                        2,
                        {
                            type: "default",
                        },
                    );
                    skipPoints = false;
                }),
            );
    }, [canvas, pointerPosRef, size, showTracer, tracerCtx, view, view2d, isCameraAlignedWithClippingPlane]);

    const selectedEntityDrawId = useRef(0);
    const drawSelectedEntity = useCallback(async () => {
        if (!view || !selectedEntityCtx || !canvas || !selectedEntitiesData) {
            return;
        }

        const id = ++selectedEntityDrawId.current;
        const drawEntities = await Promise.all(
            selectedEntitiesData.map((obj) =>
                view.measure?.draw.getDrawEntity(obj, {
                    cylinderMeasure: followCylindersFrom,
                    segmentLabelInterval: 10,
                }),
            ),
        );

        if (id !== selectedEntityDrawId.current) {
            return;
        }

        selectedEntityCtx.clearRect(0, 0, canvas.width, canvas.height);

        const cameraState = getCameraState(view.renderState.camera);
        drawEntities.forEach(
            (prod) =>
                prod &&
                drawProduct(
                    selectedEntityCtx,
                    cameraState,
                    prod,
                    { lineColor: "yellow", fillColor: measurementFillColor },
                    3,
                ),
        );
    }, [canvas, followCylindersFrom, selectedEntitiesData, selectedEntityCtx, view]);

    const drawProfile = useCallback(async () => {
        if (!svg) {
            return;
        }
        const removeMarkers = () => {
            translateInteraction(svg.children.namedItem(`followPlus`), undefined);
            translateInteraction(svg.children.namedItem(`followMinus`), undefined);
            translateInteraction(svg.children.namedItem(`followInfo`), undefined);
            translateInteraction(svg.children.namedItem(`followClose`), undefined);
        };
        if (!view?.measure || !profileCtx || !canvas || !currentProfileCenter || !currentProfile) {
            removeMarkers();
            return;
        }

        profileCtx.clearRect(0, 0, canvas.width, canvas.height);
        const pt = view.measure.draw.toMarkerPoints([currentProfileCenter])[0];

        if (!pt) {
            removeMarkers();
            return;
        }

        if (view.renderState.camera.far < 1) {
            drawPoint(profileCtx, pt, "black");
            drawTexts(profileCtx, [[pt[0], pt[1] + 20]], [`H: ${currentProfileCenter[2].toFixed(3)}`], 24);
            drawTexts(profileCtx, [[pt[0], pt[1] - 40]], ["P: " + currentProfile], 24);
            translateInteraction(svg.children.namedItem(`followPlus`), vec2.fromValues(pt[0] + 50, pt[1]));
            translateInteraction(svg.children.namedItem(`followMinus`), vec2.fromValues(pt[0] - 50, pt[1]));
            translateInteraction(svg.children.namedItem(`followInfo`), vec2.fromValues(pt[0], pt[1] - 55));
            translateInteraction(
                svg.children.namedItem(`followClose`),
                isFollowPathVisible ? undefined : vec2.fromValues(pt[0], pt[1] + 55),
            );
        } else if (view.renderState.clipping.planes.length > 0) {
            const plane = view.renderState.clipping.planes[0].normalOffset;
            const normal = vec3.fromValues(plane[0], plane[1], plane[2]);
            let up = vec3.fromValues(0, 0, 1);
            if (Math.abs(vec3.dot(normal, up)) === 1) {
                up = vec3.fromValues(0, 1, 0);
            }
            const right = vec3.cross(vec3.create(), up, normal);
            vec3.normalize(right, right);
            const pt = view.measure.draw.toMarkerPoints([
                currentProfileCenter,
                vec3.scaleAndAdd(vec3.create(), currentProfileCenter, right, 10), //Scale by 10 to avoid jitter
            ]);
            if (pt[0] && pt[1]) {
                const dir = vec2.sub(vec2.create(), pt[1], pt[0]);
                vec2.normalize(dir, dir);
                translateInteraction(
                    svg.children.namedItem(`followPlus`),
                    vec2.scaleAndAdd(vec2.create(), pt[0], dir, 40),
                );
                translateInteraction(
                    svg.children.namedItem(`followMinus`),
                    vec2.scaleAndAdd(vec2.create(), pt[0], dir, -40),
                );
                translateInteraction(
                    svg.children.namedItem(`followInfo`),
                    vec2.scaleAndAdd(
                        vec2.create(),
                        pt[0],
                        dir[0] > 0 ? vec2.fromValues(-dir[1], dir[0]) : vec2.fromValues(dir[1], -dir[0]),
                        -45,
                    ),
                );
                translateInteraction(
                    svg.children.namedItem(`followClose`),
                    isFollowPathVisible
                        ? undefined
                        : vec2.scaleAndAdd(
                              vec2.create(),
                              pt[0],
                              dir[0] <= 0 ? vec2.fromValues(-dir[1], dir[0]) : vec2.fromValues(dir[1], -dir[0]),
                              -45,
                          ),
                );
            } else {
                removeMarkers();
            }
            if (!fpObj) {
                //Special case for old bookmarks, they do not have the possibility to step without opening the windget first
                translateInteraction(svg.children.namedItem(`followPlus`), undefined);
                translateInteraction(svg.children.namedItem(`followMinus`), undefined);
            }
        } else {
            removeMarkers();
        }
    }, [canvas, currentProfile, currentProfileCenter, profileCtx, view, svg, fpObj, isFollowPathVisible]);

    const deviationsDrawId = useRef(0);
    const drawDeviations = useCallback(
        async (idleFrame: boolean) => {
            if (!view || !deviationsCtx || !canvas || !currentProfileCenter) {
                return;
            }

            const id = ++deviationsDrawId.current;

            if (!idleFrame) {
                deviationsCtx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            const centerPoint2d = view.measure?.draw.toMarkerPoints([currentProfileCenter])[0];

            if (!centerPoint2d) {
                return;
            }
            const deviations = await view.inspectDeviations({
                deviationPrioritization: followDeviations.prioritization,
                projection: { centerPoint2d, centerPoint3d: currentProfileCenter },
                generateLine: followDeviations.line,
            });

            if (id !== deviationsDrawId.current) {
                return;
            }

            deviationsCtx.clearRect(0, 0, canvas.width, canvas.height);

            if (!deviations) {
                return;
            }

            const [pts2d, labels] = deviations.labels.reduce(
                (prev, curr) => {
                    prev[0].push(curr.position);
                    prev[1].push(curr.deviation);

                    return prev;
                },
                [[] as Vec2[], [] as string[]],
            );
            dispatch(deviationsActions.setRightmost2dDeviationCoordinate(Math.max(...pts2d.map((p) => p[0]))));

            drawTexts(deviationsCtx, pts2d, labels, 20);

            if (deviations.line) {
                drawLineStrip(deviationsCtx, deviations.line, vecToHex(followDeviations.lineColor));
            }
        },
        [canvas, currentProfileCenter, deviationsCtx, followDeviations, view, dispatch],
    );

    useEffect(() => {
        drawCrossSection();
    }, [drawCrossSection, size]);

    useEffect(() => {
        drawTracer();
    }, [drawTracer, size]);

    useEffect(() => {
        drawSelectedEntity();
    }, [drawSelectedEntity, size]);

    useEffect(() => {
        drawProfile();
    }, [drawProfile, size]);

    useEffect(() => {
        renderFnRef.current = animate;
        return () => (renderFnRef.current = undefined);

        async function animate(moved: boolean, idleFrame: boolean): Promise<void> {
            if (!view || !ctx) {
                return;
            }

            if (idleFrame && !drawObjectsRef.current) {
                drawObjectsRef.current = view.getOutlineDrawObjects(
                    "clipping",
                    0,
                    undefined,
                    {
                        generateLengthLabels: true,
                        generateSlope: true,
                        closed: false,
                        angles: false,
                    },
                    roadCrossSectionData,
                );
                dispatch(followPathActions.setHasTracer2dDrawProducts(drawObjectsRef.current.length > 0));
                drawCrossSection();
            } else if (moved) {
                drawCrossSection();
                drawSelectedEntity();
            }

            if (moved || !vec2.exactEquals(prevPointerPosRef.current, pointerPosRef.current)) {
                drawTracer();
                prevPointerPosRef.current = [...pointerPosRef.current];
            }

            if (moved) {
                drawProfile();
            }

            if (moved || idleFrame) {
                drawDeviations(idleFrame);
            }
        }
    }, [
        view,
        renderFnRef,
        drawCrossSection,
        drawSelectedEntity,
        drawTracer,
        pointerPosRef,
        showTracer,
        drawProfile,
        drawDeviations,
        roadCrossSectionData,
        ctx,
        dispatch,
    ]);

    const isFollowPathOrDeviations = viewMode === ViewMode.FollowPath || viewMode === ViewMode.Deviations;

    const canDrawRoad = roadCrossSectionData && isFollowPathOrDeviations;
    const canDrawSelectedEntity = drawSelectedEntities && Boolean(selectedEntitiesData?.length);
    const canDrawTracer =
        showTracer != "off" &&
        cameraType === CameraType.Orthographic &&
        isFollowPathOrDeviations &&
        drawObjectsRef.current &&
        drawObjectsRef.current.length >= 2;
    const canDrawProfile = isFollowPathOrDeviations && currentProfileCenter && currentProfile;
    const canDrawDeviations =
        isFollowPathOrDeviations && cameraType == CameraType.Orthographic && !isTopDownOrtho && currentProfileCenter;

    return (
        <>
            {canDrawRoad && (
                <Canvas2D
                    id="follow-path-road-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
            {canDrawTracer && (
                <Canvas2D
                    id="follow-path-tracer-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setTracerCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
            {canDrawSelectedEntity && (
                <Canvas2D
                    id="follow-path-selected-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setSelectedEntityCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
            {canDrawProfile && (
                <Canvas2D
                    id="follow-path-profile-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setProfileCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
            {canDrawDeviations && (
                <Canvas2D
                    id="follow-path-deviations-canvas"
                    data-include-snapshot
                    ref={(el) => {
                        setCanvas(el);
                        setDeviationsCtx(el?.getContext("2d") ?? null);
                    }}
                    width={size.width}
                    height={size.height}
                />
            )}
        </>
    );
}
