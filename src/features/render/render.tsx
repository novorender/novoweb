import { glMatrix, mat3, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";
import {
    useEffect,
    useState,
    useRef,
    MouseEvent,
    PointerEvent,
    useCallback,
    SVGProps,
    RefCallback,
    Fragment,
} from "react";
import { SceneData } from "@novorender/data-js-api";
import { MeasureEntity } from "@novorender/measure-api";
import {
    View,
    EnvironmentDescription,
    Internal,
    CameraController,
    OrthoControllerParams,
    CameraControllerParams,
} from "@novorender/webgl-api";

import {
    Box,
    Paper,
    Typography,
    useTheme,
    styled,
    Menu,
    MenuItem,
    popoverClasses,
    CircularProgress,
} from "@mui/material";
import { css } from "@mui/styled-engine";
import { CameraAlt } from "@mui/icons-material";

import { PerformanceStats } from "features/performanceStats";
import { getDataFromUrlHash } from "features/shareLink";
import {
    panoramasActions,
    selectActivePanorama,
    selectPanoramas,
    selectShow3dMarkers,
    PanoramaStatus,
    useHandlePanoramaChanges,
} from "features/panoramas";
import { Accordion, AccordionDetails, AccordionSummary, Loading } from "components";

import { api, dataApi, measureApi } from "app";
import { useSceneId } from "hooks/useSceneId";
import { enabledFeaturesToFeatureKeys, getEnabledFeatures } from "utils/misc";
import { AsyncStatus } from "types/misc";

import {
    fetchEnvironments,
    renderActions,
    selectBaseCameraSpeed,
    selectCameraSpeedMultiplier,
    selectClippingBox,
    selectCurrentEnvironment,
    selectEnvironments,
    selectMainObject,
    selectSavedCameraPositions,
    selectSelectMultiple,
    selectDefaultVisibility,
    selectClippingPlanes,
    CameraType,
    selectCamera,
    selectEditingScene,
    SceneEditStatus,
    selectAdvancedSettings,
    selectSelectionBasketMode,
    SubtreeStatus,
    selectSubtrees,
    selectGridDefaults,
    selectSelectionBasketColor,
    selectPicker,
    Picker,
} from "slices/renderSlice";
import { explorerActions, selectLocalBookmarkId, selectUrlBookmarkId } from "slices/explorerSlice";
import { selectDeviations } from "features/deviations";
import { bookmarksActions, selectBookmarks, useSelectBookmark } from "features/bookmarks";
import { measureActions, selectMeasure } from "features/measure";
import { manholeActions, selectManholeMeasureValues, useHandleManholeUpdates } from "features/manhole";
import { ditioActions, selectMarkers, selectShowMarkers } from "features/ditio";
import { useAppDispatch, useAppSelector } from "app/store";
import { followPathActions, selectDrawSelectedPositions, usePathMeasureObjects } from "features/followPath";
import { useMeasureObjects } from "features/measure";
import { areaActions, selectArea, selectAreaDrawPoints } from "features/area";
import { useHandleAreaPoints } from "features/area";
import { useHeightProfileMeasureObject } from "features/heightProfile";
import { heightProfileActions } from "features/heightProfile";
import { pointLineActions, selectPointLine, useHandlePointLineUpdates } from "features/pointLine";
import { selectCurrentLocation, useHandleLocationMarker } from "features/myLocation";

import { useHighlighted, highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useHidden, useDispatchHidden } from "contexts/hidden";
import { useCustomGroups } from "contexts/customGroups";
import { useDispatchVisible, useVisible, visibleActions } from "contexts/visible";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";

import {
    refillObjects,
    createRendering,
    initHighlighted,
    initHidden,
    initCustomGroups,
    initEnvironment,
    initCamera,
    initClippingBox,
    initClippingPlanes,
    initAdvancedSettings,
    initDeviation,
    pickDeviationArea,
    initSubtrees,
    initProjectSettings,
} from "./utils";
import { xAxis, yAxis, axis, MAX_FLOAT } from "./consts";
import { useHandleGridChanges } from "./useHandleGridChanges";
import { useHandleCameraControls } from "./useHandleCameraControls";
import {
    getPathPoints,
    moveSvgCursor,
    resetSVG,
    renderAngles,
    renderMeasureObject,
    renderMeasurePoints,
    renderSingleMeasurePoint,
} from "./svgUtils";
import { useHandleJiraKeepAlive } from "features/jira";

glMatrix.setMatrixArrayType(Array);

const Canvas = styled("canvas")(
    () => css`
        outline: 0;
        touch-action: none;
        height: 100vh;
        width: 100vw;
    `
);

const Svg = styled("svg")(
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

const MeasurementPoint = styled("circle", { shouldForwardProp: (prop) => prop !== "disabled" })<
    SVGProps<SVGCircleElement> & { disabled?: boolean }
>(
    ({ disabled, fill }) => css`
        pointer-events: ${disabled ? "none" : "all"};
        cursor: pointer;
        fill: ${fill ?? "green"};
    `
);

const PanoramaMarker = styled((props: any) => <CameraAlt color="primary" height="50px" width="50px" {...props} />)(
    () => css`
        cursor: pointer;
        pointer-events: auto;
        filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
    `
);

const AxisText = styled((props: SVGProps<SVGTextElement>) => <text alignmentBaseline="middle" {...props} />)(
    () => css`
        fill: white;
        font-size: 16px;
        user-select: none;
        font-weight: bold;
        text-anchor: middle;
    `
);

const measurementFillColor = "rgba(0, 191, 255, 0.5)";

enum Status {
    Initial,
    NoSceneError,
    AuthError,
    ServerError,
}

type Props = {
    onInit: (params: { customProperties: unknown }) => void;
};

export function Render3D({ onInit }: Props) {
    const theme = useTheme();
    const id = useSceneId();
    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const hiddenObjects = useHidden();
    const dispatchHidden = useDispatchHidden();
    const dispatchVisible = useDispatchVisible();
    const visibleObjects = useVisible();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();
    const {
        state: { view, scene, canvas, measureScene },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();
    const selectBookmark = useSelectBookmark();

    const env = useAppSelector(selectCurrentEnvironment);
    const environments = useAppSelector(selectEnvironments);
    const mainObject = useAppSelector(selectMainObject);

    const editingScene = useAppSelector(selectEditingScene);
    const bookmarks = useAppSelector(selectBookmarks);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const cameraSpeedMultiplier = useAppSelector(selectCameraSpeedMultiplier);
    const baseCameraSpeed = useAppSelector(selectBaseCameraSpeed);
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const selectMultiple = useAppSelector(selectSelectMultiple);
    const subtrees = useAppSelector(selectSubtrees);
    const selectionBasketMode = useAppSelector(selectSelectionBasketMode);
    const selectionBasketColor = useAppSelector(selectSelectionBasketColor);
    const clippingBox = useAppSelector(selectClippingBox);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const cameraState = useAppSelector(selectCamera);
    const advancedSettings = useAppSelector(selectAdvancedSettings);
    const measure = useAppSelector(selectMeasure);
    const panoramas = useAppSelector(selectPanoramas);
    const deviation = useAppSelector(selectDeviations);
    const showPanoramaMarkers = useAppSelector(selectShow3dMarkers);
    const gridDefaults = useAppSelector(selectGridDefaults);
    const activePanorama = useAppSelector(selectActivePanorama);
    const urlBookmarkId = useAppSelector(selectUrlBookmarkId);
    const localBookmarkId = useAppSelector(selectLocalBookmarkId);
    const showDitioMarkers = useAppSelector(selectShowMarkers);
    const ditioMarkers = useAppSelector(selectMarkers);
    const drawSelectedPaths = useAppSelector(selectDrawSelectedPositions);
    const picker = useAppSelector(selectPicker);
    const areaPoints = useAppSelector(selectAreaDrawPoints);
    const myLocationPoint = useAppSelector(selectCurrentLocation);
    const areaValue = useAppSelector(selectArea);
    const { points: pointLinePoints, result: pointLineResult } = useAppSelector(selectPointLine);
    const manhole = useAppSelector(selectManholeMeasureValues);

    const dispatch = useAppDispatch();

    const rendering = useRef({
        start: () => Promise.resolve(),
        stop: () => {},
        update: () => {},
        pick: () => Promise.resolve(),
        measure: () => Promise.resolve(),
    } as ReturnType<typeof createRendering>);
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const previousId = useRef("");
    const camera2pointDistance = useRef(0);
    const flightController = useRef<CameraController>();
    const pointerDown = useRef(false);
    const isTouchPointer = useRef(false);
    const camX = useRef(vec3.create());
    const camY = useRef(vec3.create());
    const [size, setSize] = useState({ width: 0, height: 0 });

    const heightProfileMeasureObject = useHeightProfileMeasureObject();
    const measureObjects = useMeasureObjects();
    const pathMeasureObjects = usePathMeasureObjects();
    const [svg, setSvg] = useState<null | SVGSVGElement>(null);
    const [status, setStatus] = useState<{ status: Status; msg?: string }>({ status: Status.Initial });

    const [deviationStamp, setDeviationStamp] = useState<{
        mouseX: number;
        mouseY: number;
        data: {
            deviation: number;
        };
    } | null>(null);

    const closeDeviationStamp = () => {
        setDeviationStamp(null);
    };

    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    const renderParametricMeasure = useCallback(() => {
        if (!view || !svg || !measureScene) {
            return;
        }

        const { camera } = view;

        const renderPoints = (params: Omit<Parameters<typeof renderMeasurePoints>[0], "svg">) =>
            renderMeasurePoints({ svg, ...params });

        const renderObject = (
            params: Omit<Parameters<typeof renderMeasureObject>[0], "svg" | "view" | "measureScene">
        ) => renderMeasureObject({ svg, view, measureScene, ...params });

        const pathPoints = (params: Omit<Parameters<typeof getPathPoints>[0], "view">) =>
            getPathPoints({ view, ...params });

        if (drawSelectedPaths && pathMeasureObjects.status === AsyncStatus.Success) {
            pathMeasureObjects.data.forEach((obj) => {
                renderObject({
                    fillColor: measurementFillColor,
                    pathName: "fp_" + getMeasureObjectPathId(obj),
                    entity: obj,
                    advancedDrawing: false,
                    measureSettings: undefined,
                });
            });
        }

        if (heightProfileMeasureObject) {
            if (heightProfileMeasureObject.drawKind === "vertex") {
                const pts = pathPoints({ points: [heightProfileMeasureObject.pos] });
                if (pts) {
                    renderSingleMeasurePoint({
                        svg,
                        pixelPoint: pts.pixel[0],
                        pointName: "heightProfileMeasureObject",
                    });
                }
            } else {
                renderObject({
                    fillColor: "rgba(0, 255, 38, 0.5)",
                    pathName: "heightProfileMeasureObject",
                    entity: heightProfileMeasureObject,
                    advancedDrawing: false,
                    measureSettings: undefined,
                });
            }
        }

        measureObjects.forEach((obj) => {
            if (obj.drawKind === "vertex") {
                const pts = pathPoints({ points: [obj.parameter as vec3] });
                if (pts) {
                    renderSingleMeasurePoint({
                        svg,
                        pixelPoint: pts.pixel[0],
                        pointName: getMeasureObjectPathId(obj),
                    });
                } else {
                    resetSVG({ svg, pathName: getMeasureObjectPathId(obj) });
                }
            } else {
                renderObject({
                    fillColor: measurementFillColor,
                    pathName: getMeasureObjectPathId(obj),
                    entity: obj,
                    advancedDrawing: true,
                    measureSettings: obj.settings,
                });
            }
        });

        if (manhole) {
            renderObject({
                fillColor: "rgba(0, 255, 38, 0.5)",
                pathName: "manhole",
                entity: manhole,
                advancedDrawing: false,
                measureSettings: undefined,
            });
        }

        const normalPoints = measure.duoMeasurementValues?.normalPoints;
        if (normalPoints) {
            renderPoints({
                points: pathPoints({ points: normalPoints }),
                svgNames: { path: "normalDistance", point: "normal" },
                text: {
                    textName: "normalDistanceText",
                    value: vec3.len(vec3.sub(vec3.create(), normalPoints[0], normalPoints[1])),
                    type: "distance",
                },
            });
        }

        const measurePoints =
            measure.duoMeasurementValues?.pointA && measure.duoMeasurementValues?.pointB
                ? [measure.duoMeasurementValues.pointA, measure.duoMeasurementValues.pointB]
                : undefined;

        if (measurePoints) {
            const flip = measurePoints[0][1] > measurePoints[1][1];
            let pts = flip ? [measurePoints[1], measurePoints[0]] : [measurePoints[0], measurePoints[1]];
            const diff = vec3.sub(vec3.create(), pts[0], pts[1]);
            const measureLen = vec3.len(diff);

            const measurePathPoints = pathPoints({ points: measurePoints });

            renderPoints({
                points: measurePathPoints,
                svgNames: { path: "brepDistance", point: "measure" },
                text: {
                    textName: "distanceText",
                    value: measureLen,
                    type: "distance",
                },
            });

            pts = [
                pts[0],
                vec3.fromValues(pts[1][0], pts[0][1], pts[0][2]),
                vec3.fromValues(pts[1][0], pts[0][1], pts[1][2]),
                pts[1],
            ];

            const xPathPoints = pathPoints({ points: [pts[0], pts[1]] });
            renderPoints({
                points: xPathPoints,
                svgNames: { path: "brepPathX" },
                text: {
                    textName: "brepTextX",
                    value: Math.abs(diff[0]),
                    type: "distance",
                },
            });

            const yPathPoints = pathPoints({ points: [pts[1], pts[2]] });
            renderPoints({
                points: yPathPoints,
                svgNames: { path: "brepPathY" },
                text: {
                    textName: "brepTextY",
                    value: Math.abs(diff[2]),
                    type: "distance",
                },
            });

            const zPathPoints = pathPoints({ points: [pts[2], pts[3]] });

            renderPoints({
                points: zPathPoints,
                svgNames: { path: "brepPathZ" },
                text: {
                    textName: "brepTextZ",
                    value: Math.abs(diff[1]),
                    type: "distance",
                },
            });

            if (measurePathPoints && zPathPoints) {
                if (vec3.distance(camera.position, pts[3]) < measureLen * 2) {
                    const zDiff = vec3.sub(vec3.create(), pts[2], pts[3]);
                    const fromP = flip ? measurePathPoints.path[1] : measurePathPoints.path[0];
                    renderAngles({
                        svg,
                        anglePoint: zPathPoints.path[1],
                        fromP,
                        toP: zPathPoints.path[0],
                        diffA: diff,
                        diffB: zDiff,
                        pathName: `angle_measureToZ`,
                    });
                } else {
                    resetSVG({ svg, pathName: `angle_measureToZ` });
                }
            } else {
                resetSVG({ svg, pathName: `angle_measureToZ` });
            }

            const planarDiff = vec2.len(vec2.fromValues(diff[0], diff[2]));
            const pdPt1 = vec3.fromValues(pts[0][0], Math.min(pts[0][1], pts[3][1]), pts[0][2]);
            const pdPt2 = vec3.fromValues(pts[3][0], Math.min(pts[0][1], pts[3][1]), pts[3][2]);

            const xzPathPoints = pathPoints({ points: [pdPt1, pdPt2] });
            if (xPathPoints && yPathPoints && measurePathPoints && xzPathPoints) {
                const pixelDiffX =
                    vec2.dist(xPathPoints.path[0], xzPathPoints.path[0]) +
                    vec2.dist(xPathPoints.path[1], xzPathPoints.path[1]);
                const pixelDiffY =
                    vec2.dist(yPathPoints.path[0], xzPathPoints.path[0]) +
                    vec2.dist(yPathPoints.path[1], xzPathPoints.path[1]);
                const pixelMesureDiff =
                    vec2.dist(measurePathPoints.path[0], xzPathPoints.path[0]) +
                    vec2.dist(measurePathPoints.path[1], xzPathPoints.path[1]);
                const skipXZ = pixelDiffX < 20 || pixelDiffY < 20 || pixelMesureDiff < 20;
                renderPoints({
                    points: skipXZ ? undefined : xzPathPoints,
                    svgNames: { path: "brepPathXZ" },
                    text: {
                        textName: "brepTextXZ",
                        value: planarDiff,
                        type: "distance",
                    },
                });
            } else {
                resetSVG({ svg, pathName: `brepPathXZ` });
                resetSVG({ svg, pathName: `brepTextXZ` });
            }

            if (measurePathPoints && xzPathPoints) {
                if (vec3.distance(camera.position, pdPt2) < measureLen * 2) {
                    const xzDiff = vec3.sub(vec3.create(), pdPt1, pdPt2);
                    const fromP = flip ? measurePathPoints.path[0] : measurePathPoints.path[1];
                    renderAngles({
                        svg,
                        anglePoint: xzPathPoints.path[0],
                        fromP,
                        toP: xzPathPoints.path[1],
                        diffA: diff,
                        diffB: xzDiff,
                        pathName: `angle_measureToXZ`,
                    });
                } else {
                    resetSVG({ svg, pathName: `angle_measureToXZ` });
                }
            } else {
                resetSVG({ svg, pathName: `angle_measureToXZ` });
            }
        }

        if (areaPoints.length) {
            const areaPts = pathPoints({ points: areaPoints });
            if (areaPts) {
                renderPoints({
                    points: areaPts,
                    svgNames: { path: "area-path", point: "area-pt" },
                    text: {
                        textName: "areaText",
                        value: areaValue,
                        type: "center",
                        unit: "&#13217",
                    },
                });
                if (areaPoints.length > 2) {
                    const asqt = Math.sqrt(areaValue) * 5;
                    for (let i = 0; i < areaPoints.length; ++i) {
                        const anglePt = areaPoints[i];
                        if (
                            areaPts.path.length === areaPoints.length &&
                            vec3.distance(camera.position, anglePt) < asqt
                        ) {
                            const fromPIdx = i === 0 ? areaPoints.length - 1 : i - 1;
                            const toPIdx = i === areaPoints.length - 1 ? 0 : i + 1;
                            const fromP = areaPts.path[fromPIdx];
                            const toP = areaPts.path[toPIdx];
                            const diffA = vec3.sub(vec3.create(), areaPoints[fromPIdx], anglePt);
                            const diffB = vec3.sub(vec3.create(), areaPoints[toPIdx], anglePt);
                            renderAngles({
                                svg,
                                anglePoint: areaPts.path[i],
                                fromP,
                                toP,
                                diffA,
                                diffB,
                                pathName: `area-an_${i}`,
                            });
                        } else {
                            resetSVG({ svg, pathName: `area-an_${i}` });
                        }
                    }
                }
            }
        }

        if (pointLinePoints.length) {
            const pointLinePts = pathPoints({ points: pointLinePoints });
            if (pointLinePts) {
                renderPoints({
                    points: pointLinePts,
                    svgNames: { path: "line-path", point: "line-pt" },
                    text: {
                        textName: "lineText",
                        value: pointLineResult?.totalLength ?? 0,
                        type: "center",
                    },
                    closed: false,
                });
                if (pointLinePoints.length > 2) {
                    for (let i = 1; i < pointLinePoints.length - 1; ++i) {
                        const anglePt = pointLinePoints[i];
                        if (pointLinePts.path.length === pointLinePoints.length) {
                            const fromPIdx = i - 1;
                            const toPIdx = i + 1;
                            const fromP = pointLinePts.path[fromPIdx];
                            const toP = pointLinePts.path[toPIdx];
                            const diffA = vec3.sub(vec3.create(), pointLinePoints[fromPIdx], anglePt);
                            const diffB = vec3.sub(vec3.create(), pointLinePoints[toPIdx], anglePt);
                            renderAngles({
                                svg,
                                anglePoint: pointLinePts.path[i],
                                fromP,
                                toP,
                                diffA,
                                diffB,
                                pathName: `line-an_${i}`,
                            });
                        } else {
                            resetSVG({ svg, pathName: `line-an_${i}` });
                        }
                    }
                }
            }
        }

        if (myLocationPoint !== undefined) {
            const myLocationPt = pathPoints({ points: [myLocationPoint] });
            if (myLocationPt) {
                const marker = svg.children.namedItem("myLocationPoint");

                marker?.setAttribute(
                    "transform",
                    `translate(${myLocationPt.pixel[0][0] - 25} ${myLocationPt.pixel[0][1] - 40}) scale(2)`
                );
            }
        }
    }, [
        view,
        measureObjects,
        measure.duoMeasurementValues,
        pathMeasureObjects,
        drawSelectedPaths,
        areaPoints,
        pointLinePoints,
        pointLineResult,
        heightProfileMeasureObject,
        svg,
        areaValue,
        myLocationPoint,
        manhole,
        measureScene,
    ]);
    useEffect(() => {
        renderParametricMeasure();
    }, [renderParametricMeasure]);

    const moveSvg = useCallback(() => {
        if (!svg || !view || (!panoramas?.length && !ditioMarkers.length)) {
            return;
        }

        const { width, height } = size;
        const { camera } = view;
        const proj = mat4.perspective(
            mat4.create(),
            glMatrix.toRadian(camera.fieldOfView),
            width / height,
            camera.near,
            camera.far
        );
        const camMatrix = mat4.fromRotationTranslation(mat4.create(), camera.rotation, camera.position);
        mat4.invert(camMatrix, camMatrix);
        const toScreen = (p: vec3) => {
            const _p = vec4.transformMat4(vec4.create(), vec4.fromValues(p[0], p[1], p[2], 1), proj);
            return vec2.scale(
                vec2.create(),
                vec2.fromValues(((_p[0] * 0.5) / _p[3] + 0.5) * width, (0.5 - (_p[1] * 0.5) / _p[3]) * height),
                1 / devicePixelRatio
            );
        };

        if (panoramas?.length) {
            panoramas
                .map((p) => vec3.transformMat4(vec3.create(), p.position, camMatrix))
                .forEach((pos, idx) => {
                    const marker = svg.children.namedItem(`panorama-${idx}`);

                    if (!marker) {
                        return;
                    }

                    const hide = pos[2] > 0 || pos.some((num) => Number.isNaN(num) || !Number.isFinite(num));

                    if (hide) {
                        marker.setAttribute("x", "-100");
                        return;
                    }

                    const p = toScreen(pos);
                    const x = p[0].toFixed(1);
                    const y = p[1].toFixed(1);
                    marker.setAttribute("x", Number.isNaN(Number(x)) || !Number.isFinite(Number(x)) ? "-100" : x);
                    marker.setAttribute("y", Number.isNaN(Number(y)) || !Number.isFinite(Number(x)) ? "-100" : y);
                });
        }

        ditioMarkers
            .map((marker) => vec3.transformMat4(vec3.create(), marker.position, camMatrix))
            .forEach((pos, idx) => {
                const marker = svg.children.namedItem(`ditioMarker-${idx}`);

                if (!marker) {
                    return;
                }

                const hide = pos[2] > 0 || pos.some((num) => Number.isNaN(num) || !Number.isFinite(num));

                if (hide) {
                    marker.setAttribute("x", "-100");
                    return;
                }

                const p = toScreen(pos);
                const x = p[0].toFixed(1);
                const y = p[1].toFixed(1);
                marker.setAttribute("x", Number.isNaN(Number(x)) || !Number.isFinite(Number(x)) ? "-100" : x);
                marker.setAttribute("y", Number.isNaN(Number(y)) || !Number.isFinite(Number(x)) ? "-100" : y);
            });
    }, [svg, view, size, panoramas, ditioMarkers]);

    useEffect(() => {
        moveSvg();
    }, [moveSvg, showDitioMarkers, showPanoramaMarkers]);

    useEffect(() => {
        if (!environments.length) {
            dispatch(fetchEnvironments(api));
        }
    }, [dispatch, environments]);

    useEffect(() => {
        initView();

        async function initView() {
            if (previousId.current === id || !canvas || !environments.length) {
                return;
            }

            previousId.current = id;

            try {
                const sceneResponse = await dataApi.loadScene(id);

                if ("error" in sceneResponse) {
                    throw sceneResponse;
                }

                const {
                    url,
                    db,
                    objectGroups = [],
                    customProperties,
                    title,
                    viewerScenes,
                    ...sceneData
                } = sceneResponse;

                const urlData = getDataFromUrlHash();
                const camera = { kind: "flight", ...sceneData.camera, ...urlData.camera } as CameraControllerParams;
                const { display: _display, ...settings } = { ...sceneData.settings, ...urlData.settings };

                const _view = await api.createView(undefined, canvas);

                const grey = vec4.fromValues(0.75, 0.75, 0.75, 1);
                let bgColor = settings.background?.color || grey;
                const [r, g, b, a] = bgColor;

                if (r === 0 && g === 0 && b === 0.25 && a === 1) {
                    bgColor = grey;
                }

                _view.applySettings({
                    ...settings,
                    background: {
                        ...settings.background,
                        color: bgColor,
                    },
                    quality: {
                        detail: {
                            ..._view.settings.quality.detail,
                            autoAdjust: {
                                enabled: true,
                                min: -1,
                                max: 3,
                            },
                            value: Math.pow(10, 3),
                        },
                        resolution: {
                            value: 1,
                            autoAdjust: {
                                ..._view.settings.quality.resolution.autoAdjust,
                                max: window.devicePixelRatio,
                            },
                        },
                    },
                });
                _view.scene = await api.loadScene(url, db);

                const assetUrl = new URL((_view.scene as any).assetUrl);
                const measureScene = await measureApi.loadScene(assetUrl);

                const controller = initCamera({
                    canvas,
                    camera,
                    view: _view,
                    flightControllerRef: flightController,
                });

                if (!sceneData.camera && !urlData.camera) {
                    controller.autoZoomToScene = true;
                }

                cameraGeneration.current = _view.performanceStatistics.cameraGeneration;

                if (window.self === window.top || !customProperties?.enabledFeatures?.transparentBackground) {
                    initEnvironment(settings.environment as unknown as EnvironmentDescription, environments, _view);
                }

                initClippingBox(_view.settings.clippingPlanes);
                initClippingPlanes(_view.settings.clippingVolume);
                initDeviation(_view.settings.points.deviation);

                dispatchVisible(visibleActions.set([]));
                initHidden(objectGroups, dispatchHidden);
                initCustomGroups(objectGroups, dispatchCustomGroups);
                initHighlighted(objectGroups, dispatchHighlighted);
                initAdvancedSettings(_view, customProperties, api);
                initProjectSettings({ sceneData: sceneResponse });

                if (urlData.mainObject !== undefined) {
                    dispatchHighlighted(highlightActions.add([urlData.mainObject]));
                    dispatch(renderActions.setMainObject(urlData.mainObject));
                }

                if (viewerScenes) {
                    dispatch(explorerActions.setViewerScenes(viewerScenes));
                }

                const organization = (sceneData as { organization?: string }).organization ?? "";
                dispatch(explorerActions.setOrganization(organization));

                rendering.current = createRendering(canvas, _view);
                rendering.current.start();

                window.document.title = `${title} - Novorender`;
                window.addEventListener("blur", exitPointerLock);
                canvas.focus();
                const resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        canvas.width = entry.contentRect.width * devicePixelRatio;
                        canvas.height = entry.contentRect.height * devicePixelRatio;
                        _view.applySettings({
                            display: { width: canvas.width, height: canvas.height },
                        });
                        setSize({ width: canvas.width, height: canvas.height });
                    }
                });

                resizeObserver.observe(canvas);

                dispatch(renderActions.setDefaultDeviceProfile({ ...((api as any).deviceProfile ?? {}) }));
                if (customProperties?.triangleLimit) {
                    (api as any).deviceProfile.triangleLimit = Math.min(
                        (api as any).deviceProfile.triangleLimit,
                        customProperties?.triangleLimit
                    );
                }
                onInit({ customProperties });

                dispatchGlobals(
                    explorerGlobalsActions.update({
                        view: _view,
                        scene: _view.scene,
                        measureScene,
                    })
                );
            } catch (e) {
                console.warn(e);
                if (e && typeof e === "object" && "error" in e) {
                    const error = (e as { error: string }).error;

                    if (error === "Not authorized") {
                        setStatus({ status: Status.AuthError });
                    } else if (error === "Scene not found") {
                        setStatus({ status: Status.NoSceneError });
                    } else {
                        setStatus({ status: Status.ServerError, msg: error });
                    }
                } else if (e instanceof Error) {
                    setStatus({
                        status: Status.ServerError,
                        msg: e.stack ? e.stack : typeof e.cause === "string" ? e.cause : `${e.name}: ${e.message}`,
                    });
                }
            }
        }
    }, [
        canvas,
        view,
        dispatch,
        onInit,
        environments,
        id,
        dispatchGlobals,
        setStatus,
        dispatchCustomGroups,
        dispatchHidden,
        dispatchHighlighted,
        dispatchVisible,
        setSize,
    ]);

    useEffect(() => {
        if (!view || !scene) {
            return;
        }

        initSubtrees(view, scene);
    }, [view, scene]);

    useEffect(
        function initCameraMovedTracker() {
            if (!view) {
                return;
            }

            api.animate = () => cameraMoved(view);

            function cameraMoved(view: View) {
                if (cameraGeneration.current !== view.performanceStatistics.cameraGeneration) {
                    cameraGeneration.current = view.performanceStatistics.cameraGeneration ?? 0;

                    moveSvg();
                    renderParametricMeasure();
                    setDeviationStamp(null);
                    rendering.current.update({ moving: true });

                    if (movementTimer.current) {
                        clearTimeout(movementTimer.current);
                    }

                    movementTimer.current = setTimeout(() => {
                        if (!view || cameraState.type === CameraType.Orthographic || activePanorama) {
                            return;
                        }

                        const { camera } = view;
                        const lastPos = savedCameraPositions.positions[savedCameraPositions.currentIndex];

                        if (
                            lastPos &&
                            vec3.equals(camera.position, lastPos.position) &&
                            quat.equals(camera.rotation, lastPos.rotation)
                        ) {
                            return;
                        }

                        rendering.current.update({ moving: false });

                        dispatch(
                            renderActions.saveCameraPosition({
                                position: vec3.clone(view.camera.position),
                                rotation: quat.clone(view.camera.rotation),
                            })
                        );
                    }, 500);
                }
            }
        },
        [
            view,
            moveSvg,
            dispatch,
            savedCameraPositions,
            cameraState,
            advancedSettings,
            activePanorama,
            renderParametricMeasure,
        ]
    );

    useEffect(
        function handleObjectHighlightChanges() {
            if (scene && view) {
                refillObjects({
                    scene,
                    view,
                    defaultVisibility,
                    sceneId: id,
                    objectGroups: [
                        { id: "", ids: hiddenObjects.idArr, hidden: true, selected: false, color: [0, 0, 0] },
                        {
                            id: "",
                            ids: visibleObjects.idArr,
                            hidden: false,
                            selected: true,
                            ...(selectionBasketColor.use ? { color: selectionBasketColor.color } : { neutral: true }),
                        },
                        ...customGroups,
                        {
                            id: "",
                            ids: highlightedObjects.idArr,
                            color: highlightedObjects.color,
                            hidden: false,
                            selected: true,
                        },
                    ],
                    selectionBasket: { ...visibleObjects, mode: selectionBasketMode },
                });
            }
        },
        [
            id,
            scene,
            view,
            defaultVisibility,
            mainObject,
            customGroups,
            highlightedObjects,
            hiddenObjects,
            visibleObjects,
            selectionBasketMode,
            selectionBasketColor,
        ]
    );

    useEffect(
        function handleSubtreeChanges() {
            if (!view || !("advanced" in view.settings) || !subtrees) {
                return;
            }

            const settings = view.settings as Internal.RenderSettingsExt;

            settings.advanced.hideLines = subtrees.lines !== SubtreeStatus.Shown;
            settings.advanced.hidePoints = subtrees.points !== SubtreeStatus.Shown;
            settings.advanced.hideTerrain = subtrees.terrain !== SubtreeStatus.Shown;
            settings.advanced.hideTriangles = subtrees.triangles !== SubtreeStatus.Shown;
            settings.advanced.hideDocuments = subtrees.documents !== SubtreeStatus.Shown;
        },
        [subtrees, view]
    );

    useEffect(
        function handleCameraSpeedChanges() {
            if (!view || view.camera.controller.params.kind !== "flight") {
                return;
            }

            view.camera.controller.params.linearVelocity = baseCameraSpeed * cameraSpeedMultiplier;
        },
        [cameraSpeedMultiplier, baseCameraSpeed, view, canvas]
    );

    useEffect(
        function handleEnvironmentChange() {
            applyEnvironment();

            async function applyEnvironment() {
                if (!view || !env) {
                    return;
                }

                view.settings.environment = await api.loadEnvironment(env);
            }
        },
        [env, view]
    );

    useEffect(
        function handleClippingBoxChanges() {
            if (!view) {
                return;
            }

            view.applySettings({ clippingPlanes: { ...clippingBox, bounds: view.settings.clippingPlanes.bounds } });
        },
        [view, clippingBox]
    );

    useEffect(
        function handleClippingPlaneChanges() {
            if (!view) {
                return;
            }

            view.applySettings({
                clippingVolume: {
                    planes: clippingPlanes.planes,
                    enabled: clippingPlanes.planes.length ? clippingPlanes.enabled : false,
                    mode: clippingPlanes.mode,
                },
            });
        },
        [view, clippingPlanes]
    );

    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            view.applySettings({
                points: {
                    ...view.settings.points,
                    intensity: {
                        ...view.settings.points.intensity,
                        mode: ["on", "mix"].includes(deviation.mode) ? "off" : "mix",
                    },
                    deviation: {
                        ...deviation,
                        colors: [...deviation.colors].sort((a, b) => a.deviation - b.deviation),
                    },
                },
            });
        },
        [view, deviation]
    );

    useEffect(
        function handleCameraStateChange() {
            const controller = flightController.current;

            if (!view || !canvas || !controller) {
                return;
            }

            if (cameraState.type === CameraType.Flight) {
                dispatch(renderActions.setGrid({ enabled: false }));
                controller.enabled = true;
                view.camera.controller = controller;

                if (cameraState.goTo) {
                    view.camera.controller.moveTo(cameraState.goTo.position, cameraState.goTo.rotation);
                } else if (cameraState.zoomTo) {
                    view.camera.controller.zoomTo(cameraState.zoomTo);
                }
            } else if (cameraState.type === CameraType.Orthographic) {
                let orthoController: CameraController;
                if (cameraState.params) {
                    const safeParams: OrthoControllerParams = {
                        ...cameraState.params,
                        referenceCoordSys: cameraState.params.referenceCoordSys
                            ? (Array.from(cameraState.params.referenceCoordSys) as mat4)
                            : undefined,
                        position: cameraState.params.position
                            ? (Array.from(cameraState.params.position) as vec3)
                            : undefined,
                    };

                    if (!safeParams.referenceCoordSys) {
                        delete safeParams.referenceCoordSys;
                    }
                    if (!safeParams.position) {
                        delete safeParams.position;
                    }

                    orthoController = api.createCameraController(safeParams, canvas);
                } else if (cameraState.goTo) {
                    const rot = mat3.fromQuat(mat3.create(), cameraState.goTo.rotation);
                    const pos = cameraState.goTo.position;
                    const referenceCoordSys = mat4.fromValues(
                        rot[0],
                        rot[1],
                        rot[2],
                        0,
                        rot[3],
                        rot[4],
                        rot[5],
                        0,
                        rot[6],
                        rot[7],
                        rot[8],
                        0,
                        pos[0],
                        pos[1],
                        pos[2],
                        1
                    );
                    orthoController = api.createCameraController({ kind: "ortho", referenceCoordSys }, canvas);
                } else {
                    orthoController = api.createCameraController({ kind: "ortho" }, canvas);
                }

                const mat = (orthoController.params as OrthoControllerParams).referenceCoordSys;
                (orthoController.params as OrthoControllerParams).near = -0.001;

                if (mat) {
                    const right = vec3.fromValues(mat[0], mat[1], mat[2]);
                    const up = vec3.fromValues(mat[4], mat[5], mat[6]);
                    const pt = vec3.fromValues(mat[12], mat[13], mat[14]);
                    const squareSize = 1 * (gridDefaults.minorLineCount + 1);

                    dispatch(
                        renderActions.setGrid({
                            origo: pt,
                            axisY: vec3.scale(vec3.create(), up, squareSize),
                            axisX: vec3.scale(vec3.create(), right, squareSize),
                        })
                    );
                }

                if (view.camera.controller.params.kind === "ortho") {
                    (orthoController.params as OrthoControllerParams).fieldOfView =
                        view.camera.controller.params.fieldOfView;
                    orthoController.fingersMap = { ...view.camera.controller.fingersMap };
                    orthoController.mouseButtonsMap = { ...view.camera.controller.mouseButtonsMap };
                }

                controller.enabled = false;
                view.camera.controller = orthoController;
            }
        },
        [cameraState, view, canvas, dispatch, gridDefaults.minorLineCount]
    );

    useEffect(
        function handlePostEffectsChange() {
            rendering.current.update({ taaEnabled: advancedSettings.taa, ssaoEnabled: advancedSettings.ssao });
        },
        [advancedSettings]
    );

    useEffect(
        function cleanUpPreviousScene() {
            return () => {
                rendering.current.stop();
                window.removeEventListener("blur", exitPointerLock);
                dispatchGlobals(explorerGlobalsActions.update({ view: undefined, scene: undefined }));
                dispatch(renderActions.resetState());
                setStatus({ status: Status.Initial });
            };
        },
        [id, dispatch, setStatus, dispatchGlobals]
    );

    useEffect(
        function handleEditingScene() {
            if (!view || !canvas || editingScene?.status !== SceneEditStatus.Init) {
                return;
            }

            dispatch(renderActions.setViewerSceneEditing({ ...editingScene, status: SceneEditStatus.Loading }));

            if (!editingScene.id) {
                restoreAdminScene(id, view, canvas);
            } else {
                applyViewerScene(editingScene.id, view, canvas);
            }

            async function restoreAdminScene(sceneId: string, view: View, canvas: HTMLCanvasElement) {
                await applyScene(sceneId, view, canvas);
                dispatch(renderActions.setViewerSceneEditing(undefined));
            }

            async function applyViewerScene(sceneId: string, view: View, canvas: HTMLCanvasElement) {
                const { title, customProperties } = await applyScene(sceneId, view, canvas);
                const enabledFeatures = getEnabledFeatures(customProperties);
                const requireAuth = customProperties?.enabledFeatures?.enabledOrgs !== undefined;
                const expiration = customProperties?.enabledFeatures?.expiration;

                dispatch(
                    renderActions.setViewerSceneEditing({
                        title,
                        requireAuth,
                        expiration,
                        status: SceneEditStatus.Editing,
                        id: sceneId,
                        enabledFeatures: enabledFeatures ? enabledFeaturesToFeatureKeys(enabledFeatures) : [],
                    })
                );
            }

            async function applyScene(
                sceneId: string,
                view: View,
                canvas: HTMLCanvasElement
            ): Promise<Pick<SceneData, "title" | "customProperties">> {
                const {
                    settings,
                    title,
                    customProperties,
                    camera = { kind: "flight" },
                    objectGroups = [],
                } = (await dataApi.loadScene(sceneId)) as SceneData;

                if (settings) {
                    const { display: _display, light: _light, ...viewerSceneSettings } = settings;
                    view.applySettings({ ...viewerSceneSettings, light: view.settings.light });

                    initClippingBox(settings.clippingPlanes);
                    initClippingPlanes(settings.clippingVolume);
                    initDeviation(settings.points.deviation);
                    initEnvironment(settings.environment as unknown as EnvironmentDescription, environments, view);
                }

                const controller = initCamera({ view, canvas, camera, flightControllerRef: flightController });
                dispatch(
                    renderActions.setCamera({
                        type: controller.params.kind === "ortho" ? CameraType.Orthographic : CameraType.Flight,
                    })
                );

                dispatchVisible(visibleActions.set([]));
                initHidden(objectGroups, dispatchHidden);
                initCustomGroups(objectGroups, dispatchCustomGroups);
                initHighlighted(objectGroups, dispatchHighlighted);
                initAdvancedSettings(view, customProperties, api);
                dispatch(bookmarksActions.resetState());

                return { title, customProperties };
            }
        },
        [
            id,
            editingScene,
            view,
            environments,
            canvas,
            bookmarks,
            customGroups,
            dispatch,
            dispatchHidden,
            dispatchCustomGroups,
            dispatchHighlighted,
            dispatchVisible,
            env,
        ]
    );

    useHandleGridChanges();
    useHandlePanoramaChanges();
    useHandleCameraControls();
    useHandleAreaPoints();
    useHandleLocationMarker();
    useHandleManholeUpdates();
    useHandlePointLineUpdates();
    useHandleJiraKeepAlive();

    useEffect(() => {
        handleUrlBookmark();

        async function handleUrlBookmark() {
            if (!view || !urlBookmarkId) {
                return;
            }

            dispatch(explorerActions.setUrlBookmarkId(undefined));

            try {
                const bookmark = (await dataApi.getBookmarks(id, { group: urlBookmarkId })).find(
                    (bm) => bm.id === urlBookmarkId
                );

                if (!bookmark) {
                    return;
                }

                selectBookmark(bookmark);
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, id, dispatch, selectBookmark, urlBookmarkId]);

    useEffect(() => {
        handleLocalBookmark();

        function handleLocalBookmark() {
            if (!view || !localBookmarkId) {
                return;
            }

            dispatch(explorerActions.setLocalBookmarkId(undefined));

            try {
                const storedBm = localStorage.getItem(localBookmarkId);

                if (!storedBm) {
                    return;
                }

                localStorage.removeItem(localBookmarkId);
                const bookmark = JSON.parse(storedBm);

                if (!bookmark) {
                    return;
                }

                selectBookmark(bookmark);
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, id, dispatch, selectBookmark, localBookmarkId]);

    const exitPointerLock = () => {
        if ("exitPointerLock" in window.document) {
            window.document.exitPointerLock();
        }
    };

    const handleClick = async (e: MouseEvent | PointerEvent) => {
        if (!view || clippingBox.defining || !canvas) {
            return;
        }

        const result = await rendering.current.pick(
            e.nativeEvent.offsetX * devicePixelRatio,
            e.nativeEvent.offsetY * devicePixelRatio
        );

        if (deviation.mode !== "off" && cameraState.type === CameraType.Orthographic) {
            const pickSize = isTouchPointer.current ? 16 : 0;
            const deviation = await pickDeviationArea({
                measure: rendering.current.measure,
                size: pickSize,
                clickX: e.nativeEvent.offsetX * devicePixelRatio,
                clickY: e.nativeEvent.offsetY * devicePixelRatio,
            });

            if (deviation) {
                setDeviationStamp({
                    mouseX: e.nativeEvent.offsetX,
                    mouseY: e.nativeEvent.offsetY,
                    data: {
                        deviation: deviation,
                    },
                });

                return;
            } else {
                setDeviationStamp(null);
            }
        } else {
            setDeviationStamp(null);
        }

        if (!result || result.objectId > 0x1000000) {
            return;
        }

        const { normal: _normal, position } = result;
        const normal = _normal.some((n) => Number.isNaN(n)) ? undefined : result.normal;

        switch (picker) {
            case Picker.Object:
                if (result.objectId === -1) {
                    return;
                }

                const alreadySelected = highlightedObjects.ids[result.objectId] === true;

                if (selectMultiple) {
                    if (alreadySelected) {
                        if (result.objectId === mainObject) {
                            dispatch(renderActions.setMainObject(undefined));
                        }
                        dispatchHighlighted(highlightActions.remove([result.objectId]));
                    } else {
                        dispatch(renderActions.setMainObject(result.objectId));
                        dispatchHighlighted(highlightActions.add([result.objectId]));
                    }
                } else {
                    if (alreadySelected && highlightedObjects.idArr.length === 1) {
                        dispatch(renderActions.setMainObject(undefined));
                        dispatchHighlighted(highlightActions.setIds([]));
                    } else {
                        dispatch(renderActions.setMainObject(result.objectId));
                        dispatchHighlighted(highlightActions.setIds([result.objectId]));
                    }
                }
                break;
            case Picker.ClippingPlane:
                if (!normal) {
                    return;
                }

                const w = -vec3.dot(normal, position);

                dispatch(renderActions.setPicker(Picker.Object));
                dispatch(
                    renderActions.setClippingPlanes({
                        planes: [vec4.fromValues(normal[0], normal[1], normal[2], w)],
                        baseW: w,
                    })
                );
                break;
            case Picker.OrthoPlane:
                const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
                (orthoController as any).init(result.position, normal, view.camera);
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        params: orthoController.params as OrthoControllerParams,
                    })
                );
                dispatch(renderActions.setPicker(Picker.Object));

                break;
            case Picker.Measurement:
                dispatch(
                    measureActions.selectObj({ id: measure.forcePoint ? -1 : result.objectId, pos: result.position })
                );
                break;
            case Picker.Manhole:
                if (result.objectId === -1) {
                    return;
                }

                dispatch(manholeActions.selectObj(result.objectId));
                break;

            case Picker.FollowPathObject: {
                if (result.objectId === -1) {
                    return;
                }

                dispatch(followPathActions.setSelectedPositions([{ id: result.objectId, pos: result.position }]));
                break;
            }
            case Picker.Area: {
                dispatch(areaActions.addPoint([result.position, normal ?? [0, 0, 0]]));
                break;
            }
            case Picker.PointLine: {
                dispatch(pointLineActions.addPoint(result.position));
                break;
            }
            case Picker.HeightProfileEntity: {
                if (result.objectId === -1) {
                    return;
                }

                dispatch(heightProfileActions.selectPoint({ id: result.objectId, pos: result.position }));
                break;
            }
            default:
                console.warn("Picker not handled", picker);
        }
    };

    const handleDown = async (x: number, y: number) => {
        if (!view || !(clippingBox.defining || clippingBox.showBox)) {
            return;
        }

        pointerDown.current = true;

        const result = await rendering.current.pick(x, y);

        if (!result || !pointerDown.current) {
            return;
        }

        const { position: point } = result;
        const { position, rotation, fieldOfView } = view.camera;
        camera2pointDistance.current = vec3.dist(point, position);
        vec3.transformQuat(camX.current, xAxis, rotation);
        vec3.transformQuat(camY.current, yAxis, rotation);

        if (clippingBox.defining) {
            view.camera.controller.enabled = false;
            const tan = Math.tan(0.5 * glMatrix.toRadian(fieldOfView));
            const size = 0.25 * tan * camera2pointDistance.current;
            const bounds = {
                min: vec3.fromValues(point[0] - size, point[1] - size, point[2] - size),
                max: vec3.fromValues(point[0] + size, point[1] + size, point[2] + size),
            };

            view.applySettings({ clippingPlanes: { ...clippingBox, bounds } });
        } else if (result.objectId > 0xfffffffe || result.objectId < 0xfffffff9) {
            camera2pointDistance.current = 0;
        } else if (clippingBox.enabled && clippingBox.showBox) {
            view.camera.controller.enabled = false;

            const highlight = 0xfffffffe - result.objectId;

            dispatch(renderActions.setClippingBox({ ...clippingBox, highlight }));
        }
    };

    const handlePointerDown = (e: PointerEvent) => {
        if (e.pointerType === "mouse") {
            isTouchPointer.current = false;
            return;
        }

        isTouchPointer.current = true;
        handleDown(e.nativeEvent.offsetX * devicePixelRatio, e.nativeEvent.offsetY * devicePixelRatio);
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) {
            return;
        }

        handleDown(e.nativeEvent.offsetX * devicePixelRatio, e.nativeEvent.offsetY * devicePixelRatio);
    };

    const handleUp = () => {
        if (!view) {
            return;
        }

        if (camera2pointDistance.current > 0 && clippingBox.defining) {
            dispatch(renderActions.setClippingBox({ ...clippingBox, defining: false }));
        }

        pointerDown.current = false;
        camera2pointDistance.current = 0;
        exitPointerLock();
        view.camera.controller.enabled = true;
    };

    const handleMove = async (e: PointerEvent) => {
        if (!view || !canvas || !svg || (!e.movementY && !e.movementX)) {
            return;
        }

        const useSvgCursor =
            e.buttons === 0 &&
            [
                Picker.Measurement,
                Picker.OrthoPlane,
                Picker.FollowPathObject,
                Picker.ClippingPlane,
                Picker.Area,
                Picker.PointLine,
                Picker.Manhole,
                Picker.HeightProfileEntity,
            ].includes(picker);

        if (useSvgCursor) {
            const measurement = await rendering.current.measure(
                e.nativeEvent.offsetX * devicePixelRatio,
                e.nativeEvent.offsetY * devicePixelRatio
            );
            canvas.style.cursor = "none";

            moveSvgCursor({ svg, view, size, measurement, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

            return;
        } else {
            moveSvgCursor({ svg, view, size, measurement: undefined, x: -100, y: -100 });
        }

        if (
            deviation.mode !== "off" &&
            cameraState.type === CameraType.Orthographic &&
            e.buttons === 0 &&
            subtrees?.points === SubtreeStatus.Shown
        ) {
            const measurement = await rendering.current.measure(
                e.nativeEvent.offsetX * devicePixelRatio,
                e.nativeEvent.offsetY * devicePixelRatio
            );

            if (measurement?.deviation) {
                setDeviationStamp({
                    mouseX: e.nativeEvent.offsetX,
                    mouseY: e.nativeEvent.offsetY,
                    data: { deviation: measurement.deviation },
                });
            } else {
                setDeviationStamp(null);
            }
        } else {
            setDeviationStamp(null);
        }

        canvas.style.cursor = "default";

        if (
            !pointerDown.current ||
            !clippingBox.enabled ||
            !clippingBox.showBox ||
            camera2pointDistance.current === 0
        ) {
            return;
        }

        const activeSide = clippingBox.highlight;

        if (activeSide === -1 && !clippingBox.defining) {
            return;
        }

        e.stopPropagation();

        const { clientHeight } = canvas;
        const min = vec3.clone(view.settings.clippingPlanes.bounds.min);
        const max = vec3.clone(view.settings.clippingPlanes.bounds.max);
        const tan = Math.tan(0.5 * glMatrix.toRadian(view.camera.fieldOfView));
        const scale = (2 * tan * camera2pointDistance.current) / clientHeight;
        let x = e.movementX;
        let y = e.movementY;
        x *= scale;
        y *= scale;

        if (clippingBox.defining) {
            const dist = x + y;
            const delta = vec3.fromValues(dist, dist, dist);
            vec3.add(max, max, delta);
            vec3.sub(min, min, delta);
        } else {
            const dir = vec3.scale(vec3.create(), camX.current, x);
            vec3.sub(dir, dir, vec3.scale(vec3.create(), camY.current, y));
            const axisIdx = activeSide % 3;
            const currentAxis = axis[axisIdx];
            const dist = vec3.len(dir) * Math.sign(vec3.dot(currentAxis, dir));

            if (activeSide > 2) {
                max[activeSide - 3] += dist;
            } else {
                min[activeSide] += dist;
            }
            if (min[activeSide % 3] > max[activeSide % 3]) {
                const tmp = min[axisIdx];
                min[axisIdx] = max[axisIdx];
                max[axisIdx] = tmp;
                dispatch(
                    renderActions.setClippingBox({
                        ...clippingBox,
                        highlight: activeSide > 2 ? axisIdx : axisIdx + 3,
                    })
                );
            }
        }

        view.applySettings({ clippingPlanes: { ...clippingBox, bounds: { min, max } } });
    };

    return (
        <Box position="relative" width="100%" height="100%" sx={{ userSelect: "none" }}>
            {isSceneError(status.status) ? (
                <SceneError error={status.status} msg={status.msg} id={id} />
            ) : (
                <>
                    {advancedSettings.showPerformance && view && canvas ? <PerformanceStats /> : null}
                    <Canvas
                        id="main-canvas"
                        tabIndex={1}
                        ref={canvasRef}
                        onClick={handleClick}
                        onMouseDown={handleMouseDown}
                        onPointerEnter={handlePointerDown}
                        onPointerMove={handleMove}
                        onPointerUp={handleUp}
                        onPointerOut={() => {
                            if (svg && view) {
                                moveSvgCursor({ svg, view, size, measurement: undefined, x: -100, y: -100 });
                            }
                        }}
                    />
                    <Menu
                        open={deviationStamp !== null}
                        onClose={closeDeviationStamp}
                        sx={{
                            [`&.${popoverClasses.root}`]: {
                                pointerEvents: "none",
                            },
                        }}
                        anchorReference="anchorPosition"
                        anchorPosition={
                            deviationStamp !== null
                                ? { top: deviationStamp.mouseY, left: deviationStamp.mouseX }
                                : undefined
                        }
                        transitionDuration={{ exit: 0 }}
                    >
                        <Box sx={{ pointerEvents: "auto" }}>
                            <MenuItem>
                                Deviation:{" "}
                                {deviationStamp?.data.deviation === MAX_FLOAT
                                    ? "Outside range -1 to 1"
                                    : deviationStamp?.data.deviation.toFixed(3)}
                            </MenuItem>
                        </Box>
                    </Menu>
                    {canvas !== null && (
                        <Svg width={canvas.width} height={canvas.height} ref={setSvg}>
                            {areaPoints.length ? (
                                <>
                                    <path
                                        name={`area-path`}
                                        id={`area-path`}
                                        fill={measurementFillColor}
                                        stroke="yellow"
                                        strokeWidth={1}
                                    />
                                    <AxisText id={`areaText`} />
                                    {areaPoints.map((_pt, idx, array) => (
                                        <Fragment key={idx}>
                                            <MeasurementPoint
                                                disabled
                                                name={`area-pt_${idx}`}
                                                id={`area-pt_${idx}`}
                                                stroke="black"
                                                fill={idx === 0 ? "green" : idx === array.length - 1 ? "blue" : "white"}
                                                strokeWidth={2}
                                                r={5}
                                            />
                                            {array.length > 2 ? <g id={`area-an_${idx}`} /> : null}
                                        </Fragment>
                                    ))}
                                </>
                            ) : null}
                            {pointLinePoints.length ? (
                                <>
                                    <path
                                        name={`line-path`}
                                        id={`line-path`}
                                        stroke="yellow"
                                        strokeWidth={1}
                                        fill="none"
                                    />
                                    <AxisText id={`lineText`} />
                                    {pointLinePoints.map((_pt, idx, arr) => (
                                        <Fragment key={idx}>
                                            <MeasurementPoint
                                                disabled
                                                name={`line-pt_${idx}`}
                                                id={`line-pt_${idx}`}
                                                stroke="black"
                                                strokeWidth={2}
                                                fill={idx === 0 ? "green" : idx === arr.length - 1 ? "blue" : "white"}
                                                r={5}
                                            />
                                            {idx === 0 || idx === arr.length - 1 ? null : <g id={`line-an_${idx}`} />}
                                        </Fragment>
                                    ))}
                                </>
                            ) : null}

                            {drawSelectedPaths
                                ? pathMeasureObjects.status === AsyncStatus.Success &&
                                  pathMeasureObjects.data.map((obj) => (
                                      <path
                                          key={getMeasureObjectPathId(obj)}
                                          id={"fp_" + getMeasureObjectPathId(obj)}
                                          d=""
                                          stroke="yellow"
                                          strokeWidth=""
                                          fill="none"
                                      />
                                  ))
                                : null}
                            {measureObjects.map((obj, idx) =>
                                obj.drawKind === "vertex" ? (
                                    <MeasurementPoint
                                        key={getMeasureObjectPathId(obj)}
                                        id={getMeasureObjectPathId(obj)}
                                        r={5}
                                        disabled={true}
                                        fill="green"
                                        stroke="black"
                                        strokeWidth={2}
                                    />
                                ) : (
                                    <Fragment key={`${getMeasureObjectPathId(obj)}_${idx}`}>
                                        <defs id={"gr_def_" + obj.ObjectId}>
                                            <linearGradient id={"gr_" + obj.ObjectId} x1={0} x2={0} y1={0} y2={1}>
                                                <stop offset="0%" stopColor="green" />
                                                <stop offset="100%" stopColor="red" />
                                            </linearGradient>
                                        </defs>
                                        {Array.from({ length: 3 }).map((_, idx) => (
                                            <path
                                                key={`${getMeasureObjectPathId(obj)}_${idx}`}
                                                id={`${getMeasureObjectPathId(obj)}_${idx}`}
                                                d=""
                                                stroke={"yellow"}
                                                strokeWidth="2"
                                                fill={"blue"}
                                            />
                                        ))}
                                    </Fragment>
                                )
                            )}
                            {measure.duoMeasurementValues?.normalPoints ? (
                                <>
                                    <path id="normalDistance" d="" stroke="black" strokeWidth={3} fill="none" />
                                    <MeasurementPoint
                                        name={`normal start`}
                                        id={`normal_0`}
                                        r={5}
                                        disabled={true}
                                        fill="black"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                    <MeasurementPoint
                                        name={`normal end`}
                                        id={`normal_1`}
                                        r={5}
                                        disabled={true}
                                        fill="black"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                    <AxisText id={`normalDistanceText`} />
                                </>
                            ) : null}
                            {measure.duoMeasurementValues?.pointA && measure.duoMeasurementValues?.pointB ? (
                                <>
                                    <path id="brepDistance" d="" stroke="green" strokeWidth={2} fill="none" />
                                    <path id="brepPathX" d="" stroke="red" strokeWidth={2} fill="none" />
                                    <path id="brepPathY" d="" stroke="lightgreen" strokeWidth={2} fill="none" />
                                    <path id="brepPathZ" d="" stroke="blue" strokeWidth={2} fill="none" />
                                    <path id="brepPathXZ" d="" stroke="purple" strokeWidth={2} fill="none" />
                                    <g id={`angle_measureToZ`}></g>
                                    <g id={`angle_measureToXZ`}></g>
                                    <AxisText id="brepTextX" />
                                    <AxisText id="brepTextY" />
                                    <AxisText id="brepTextZ" />
                                    <AxisText id="brepTextXZ" />
                                    <AxisText id={`distanceText`} />
                                    <AxisText id={`areaText`} />
                                </>
                            ) : null}
                            {heightProfileMeasureObject ? (
                                heightProfileMeasureObject.drawKind === "vertex" ? (
                                    <MeasurementPoint
                                        id={"heightProfileMeasureObject"}
                                        r={5}
                                        disabled={true}
                                        fill="yellow"
                                        stroke="black"
                                        strokeWidth={2}
                                    />
                                ) : (
                                    <path
                                        id={"heightProfileMeasureObject"}
                                        d=""
                                        stroke="yellow"
                                        strokeWidth={2}
                                        fill="none"
                                    />
                                )
                            ) : null}
                            {manhole ? (
                                <>
                                    <path id={"manhole"} d="" stroke="yellow" strokeWidth={2} fill="none" />
                                    <path id={"manhole_filled"} d="" stroke="yellow" strokeWidth={2} fill="none" />
                                </>
                            ) : null}
                            {myLocationPoint ? (
                                <path
                                    id="myLocationPoint"
                                    name="myLocationPoint"
                                    fill={theme.palette.primary.main}
                                    d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 2c1.1 0 2 .9 2 2 0 1.11-.9 2-2 2s-2-.89-2-2c0-1.1.9-2 2-2zm0 10c-1.67 0-3.14-.85-4-2.15.02-1.32 2.67-2.05 4-2.05s3.98.73 4 2.05c-.86 1.3-2.33 2.15-4 2.15z"
                                ></path>
                            ) : null}
                            {panoramas && showPanoramaMarkers
                                ? panoramas.map((panorama, idx) => {
                                      if (!activePanorama) {
                                          return (
                                              <PanoramaMarker
                                                  id={`panorama-${idx}`}
                                                  name={`panorama-${idx}`}
                                                  key={panorama.guid}
                                                  onClick={() =>
                                                      dispatch(
                                                          panoramasActions.setStatus([
                                                              PanoramaStatus.Loading,
                                                              panorama.guid,
                                                          ])
                                                      )
                                                  }
                                              />
                                          );
                                      }

                                      const activeIdx = panoramas.findIndex(
                                          (pano) => pano.guid === activePanorama.guid
                                      );

                                      if (Math.abs(idx - activeIdx) === 1) {
                                          return (
                                              <PanoramaMarker
                                                  id={`panorama-${idx}`}
                                                  name={`panorama-${idx}`}
                                                  key={panorama.guid}
                                                  onClick={() =>
                                                      dispatch(
                                                          panoramasActions.setStatus([
                                                              PanoramaStatus.Loading,
                                                              panorama.guid,
                                                          ])
                                                      )
                                                  }
                                              />
                                          );
                                      }

                                      return null;
                                  })
                                : null}
                            {showDitioMarkers && ditioMarkers
                                ? ditioMarkers.map((marker, idx) => (
                                      <PanoramaMarker
                                          height="32px"
                                          width="32px"
                                          id={`ditioMarker-${idx}`}
                                          name={`ditioMarker-${idx}`}
                                          key={marker.id}
                                          onClick={() => dispatch(ditioActions.setClickedMarker(marker.id))}
                                      />
                                  ))
                                : null}
                            <g id="cursor" />
                        </Svg>
                    )}
                    {!view ? <Loading /> : null}
                </>
            )}
        </Box>
    );
}

function SceneError({ id, error, msg }: { id: string; error: Exclude<Status, Status.Initial>; msg?: string }) {
    const theme = useTheme();
    const loginUrl = `${window.location.origin}/login/${id}${window.location.search}`;

    if (error === Status.AuthError) {
        window.location.replace(
            loginUrl +
                (window.location.search
                    ? window.location.search.includes("force-login=true")
                        ? ""
                        : "&force-login=true"
                    : "?force-login=true")
        );
    }

    return (
        <Box
            bgcolor={theme.palette.secondary.main}
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={"100vh"}
        >
            {error === Status.AuthError ? (
                <CircularProgress />
            ) : (
                <Paper sx={{ minWidth: 320, maxWidth: `min(600px, 90%)`, wordBreak: "break-word", p: 2 }}>
                    <Box>
                        <Typography paragraph variant="h4" component="h1" align="center">
                            {error === Status.ServerError
                                ? "An error occured"
                                : error === Status.NoSceneError
                                ? `Scene not found`
                                : "Unable to load scene"}
                        </Typography>
                        <Typography paragraph>
                            {error === Status.ServerError ? (
                                "Failed to download the scene. Please try again later."
                            ) : error === Status.NoSceneError ? (
                                <>
                                    The scene with id <em>{id}</em> does not exist.
                                </>
                            ) : (
                                <>
                                    You do not have access to the scene <em>{id}</em>.
                                </>
                            )}
                        </Typography>
                        <Accordion>
                            <AccordionSummary>Details</AccordionSummary>
                            <AccordionDetails>
                                <Box p={1}>
                                    <>
                                        Timestamp: {new Date().toISOString()} <br />
                                        API: {api.version} <br />
                                        Dataserver: {(dataApi as any).serviceUrl}
                                        {msg ? (
                                            <Box mt={2}>
                                                ERROR: <br />
                                                {msg}
                                            </Box>
                                        ) : null}
                                    </>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}

function getMeasureObjectPathId(obj: MeasureEntity): string {
    return (
        obj.ObjectId +
        (obj.drawKind === "vertex" ? vec3.str(obj.parameter as vec3) : `${obj.instanceIndex}_${obj.pathIndex}`)
    );
}

function isSceneError(status: Status): status is Exclude<Status, Status.Initial> {
    return [Status.AuthError, Status.NoSceneError, Status.ServerError].includes(status);
}
