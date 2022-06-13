import { glMatrix, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";
import { useEffect, useState, useRef, MouseEvent, PointerEvent, useCallback, SVGProps, RefCallback } from "react";
import { SceneData } from "@novorender/data-js-api";
import {
    View,
    EnvironmentDescription,
    Internal,
    CameraController,
    OrthoControllerParams,
    CameraControllerParams,
    MeasureInfo,
} from "@novorender/webgl-api";
import { MeasureObject, MeasureSettings, DuoMeasurementValues } from "@novorender/measure-api";

import { Box, Button, Paper, Typography, useTheme, styled, Menu, MenuItem, popoverClasses } from "@mui/material";
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
import { Loading } from "components";

import { api, dataApi, measureApi, msalInstance } from "app";
import { StorageKey } from "config/storage";
import { useMountedState } from "hooks/useMountedState";
import { useSceneId } from "hooks/useSceneId";
import { deleteFromStorage } from "utils/storage";
import { enabledFeaturesToFeatureKeys, getEnabledFeatures } from "utils/misc";

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
    selectSelectiongOrthoPoint,
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
} from "slices/renderSlice";
import { authActions, selectMsalAccount } from "slices/authSlice";
import { explorerActions, selectUrlBookmarkId } from "slices/explorerSlice";
import { selectDeviations } from "features/deviations";
import { bookmarksActions, selectBookmarks, useSelectBookmark } from "features/bookmarks";
import { measureActions, selectMeasure, isMeasureObject } from "features/measure";
import { ditioActions, selectMarkers, selectShowMarkers } from "features/ditio";
import { useAppDispatch, useAppSelector } from "app/store";

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
    inversePixelRatio,
    initProjectSettings,
} from "./utils";
import { xAxis, yAxis, axis, MAX_FLOAT } from "./consts";
import { useHandleGridChanges } from "./useHandleGridChanges";

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
        stroke: none;
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

enum Status {
    Initial,
    Error,
}

type ExtendedMeasureObject = MeasureObject & {
    pos: vec3;
    settings?: MeasureSettings;
};

type MeasurePoint = {
    pos: vec3;
    id: number;
    settings?: any;
    selectedEntity?: any;
};

type Props = {
    onInit: (params: { customProperties: unknown }) => void;
};

export function Render3D({ onInit }: Props) {
    const id = useSceneId();
    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const hiddenObjects = useHidden();
    const dispatchHidden = useDispatchHidden();
    const dispatchVisible = useDispatchVisible();
    const visibleObjects = useVisible();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();
    const {
        state: { view, scene, canvas, measureScene, preloadedScene },
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
    const selectingOrthoPoint = useAppSelector(selectSelectiongOrthoPoint);
    const advancedSettings = useAppSelector(selectAdvancedSettings);
    const measure = useAppSelector(selectMeasure);
    const panoramas = useAppSelector(selectPanoramas);
    const deviation = useAppSelector(selectDeviations);
    const showPanoramaMarkers = useAppSelector(selectShow3dMarkers);
    const gridDefaults = useAppSelector(selectGridDefaults);
    const activePanorama = useAppSelector(selectActivePanorama);
    const urlBookmarkId = useAppSelector(selectUrlBookmarkId);
    const showDitioMarkers = useAppSelector(selectShowMarkers);
    const ditioMarkers = useAppSelector(selectMarkers);
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

    const [measureObjects, setMeasureObjects] = useMountedState([] as (ExtendedMeasureObject | MeasurePoint)[]);
    const [svg, setSvg] = useState<null | SVGSVGElement>(null);
    const [status, setStatus] = useMountedState(Status.Initial);

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

    const renderSingleMeasurePoint = useCallback(
        (view: View, point: vec3, pointName: string) => {
            if (!svg || !measureApi) {
                return;
            }

            const { width, height } = size;
            const [_pathPoints, _pixelPoints] = measureApi.toPathPoints([point], view, width, height);
            const pixelPoints = inversePixelRatio(_pixelPoints as vec2[]);

            pixelPoints.forEach((p) => {
                const circle = svg.children.namedItem(pointName);
                if (circle) {
                    circle.setAttribute("cx", p[0].toFixed(1));
                    circle.setAttribute("cy", p[1].toFixed(1));
                }
            });
        },
        [svg, size]
    );

    const renderMeasurePoints = useCallback(
        (
            view: View,
            points: vec3[],
            pathName: string | undefined,
            pointName?: string,
            txt?: { textName: string; distance: number }
        ) => {
            if (!svg || !measureApi) {
                return;
            }

            const { width, height } = size;
            const [_pathPoints, _pixelPoints] = measureApi.toPathPoints(points, view, width, height);
            const pathPoints = inversePixelRatio(_pathPoints as vec2[]);
            const pixelPoints = inversePixelRatio(_pixelPoints as vec2[]);
            if (pathName) {
                let curve = "";
                if (pathPoints.length > 1) {
                    curve += `M${pathPoints[0][0]}, ${pathPoints[0][1]}`;
                    for (let i = 0; i < pathPoints.length; ++i) {
                        curve += ` L${pathPoints[i][0]}, ${pathPoints[i][1]}`;
                    }
                }
                const path = svg.children.namedItem(pathName);
                if (path) {
                    path.setAttribute("d", curve);
                }
            }
            if (pointName) {
                if (pixelPoints.length) {
                    pixelPoints.forEach((p, i) => {
                        const circle = svg.children.namedItem(`${pointName}_${i}`);
                        if (circle) {
                            circle.setAttribute("cx", p[0].toFixed(1));
                            circle.setAttribute("cy", p[1].toFixed(1));
                        }
                    });
                } else {
                    const circles = svg.querySelectorAll(`[id^='${pointName}_']`);
                    circles.forEach((circle) => {
                        circle.removeAttribute("cx");
                        circle.removeAttribute("cy");
                    });
                }
            }
            if (txt) {
                const text = svg.children.namedItem(txt.textName);
                if (!text) {
                    return;
                }
                if (pathPoints.length !== 2) {
                    text.innerHTML = "";
                    return;
                }

                const _text = `${+txt.distance.toFixed(3)} m`;
                let dir =
                    pathPoints[0][0] > pathPoints[1][0]
                        ? vec2.sub(vec2.create(), pathPoints[0], pathPoints[1])
                        : vec2.sub(vec2.create(), pathPoints[1], pathPoints[0]);
                const pixLen = _text.length * 12 + 20;
                if (vec2.sqrLen(dir) > pixLen * pixLen) {
                    const angle = (Math.asin(dir[1] / vec2.len(dir)) * 180) / Math.PI;
                    const off = vec3.fromValues(0, 0, -1);
                    vec3.scale(off, vec3.normalize(off, vec3.cross(off, off, vec3.fromValues(dir[0], dir[1], 0))), 5);
                    const center = vec2.create();
                    vec2.lerp(center, pathPoints[0], pathPoints[1], 0.5);
                    text.setAttribute("x", (center[0] + off[0]).toFixed(1));
                    text.setAttribute("y", (center[1] + off[1]).toFixed(1));
                    text.setAttribute("transform", `rotate(${angle} ${center[0] + off[0]},${center[1] + off[1]})`);
                    text.innerHTML = _text;
                } else {
                    text.innerHTML = "";
                }
            }
        },
        [svg, size]
    );

    const renderMeasureObject = useCallback(
        (view: View, fillColor: string, pathName: string, objToDraw: MeasureObject) => {
            const path = svg?.children.namedItem(pathName);

            if (!path) {
                return;
            }

            const { width, height } = size;
            objToDraw.renderMeasureEntity(view, width, height).then((drawObjects) => {
                if (!drawObjects?.length) {
                    return;
                }

                let fillCurves = "";
                let edgeCurves = "";
                for (const drawObject of drawObjects) {
                    if (drawObject && drawObject.vertices.length > 1) {
                        drawObject.vertices = inversePixelRatio(drawObject.vertices as vec2[]);
                        if (drawObject.drawType === "lines") {
                            edgeCurves += `M${drawObject.vertices[0][0]}, ${drawObject.vertices[0][1]}`;
                            for (let i = 0; i < drawObject.vertices.length; ++i) {
                                edgeCurves += ` L${drawObject.vertices[i][0]}, ${drawObject.vertices[i][1]}`;
                            }
                        } else {
                            fillCurves += `M${drawObject.vertices[0][0]}, ${drawObject.vertices[0][1]}`;
                            for (let i = 0; i < drawObject.vertices.length; ++i) {
                                fillCurves += ` L${drawObject.vertices[i][0]}, ${drawObject.vertices[i][1]}`;
                            }
                        }
                    }
                }

                if (edgeCurves.length > 0) {
                    path.setAttribute("d", edgeCurves);
                    path.setAttribute("fill", "none");
                } else if (fillCurves.length > 0) {
                    path.setAttribute("d", fillCurves);
                    path.setAttribute("fill", fillColor);
                } else {
                    path.setAttribute("d", "");
                }
            });
        },
        [svg, size]
    );

    const renderParametricMeasure = useCallback(() => {
        if (!view) {
            return;
        }

        measureObjects.forEach((obj) => {
            if (isMeasureObject(obj)) {
                renderMeasureObject(view, "rgba(0, 191, 255, 0.5)", getMeasureObjectPathId(obj), obj);
            } else {
                renderSingleMeasurePoint(view, obj.pos, getMeasureObjectPathId(obj));
            }
        });

        const normalPoints = measure.duoMeasurementValues?.normalPoints;
        if (normalPoints) {
            renderMeasurePoints(view, normalPoints, "normalDistance", "normal", {
                textName: "normalDistanceText",
                distance: vec3.len(vec3.sub(vec3.create(), normalPoints[0], normalPoints[1])),
            });
        }

        const measurePoints =
            measure.duoMeasurementValues?.pointA && measure.duoMeasurementValues?.pointB
                ? [measure.duoMeasurementValues.pointA, measure.duoMeasurementValues.pointB]
                : undefined;
        if (measurePoints) {
            let pts =
                measurePoints[0][1] < measurePoints[1][1]
                    ? [measurePoints[0], measurePoints[1]]
                    : [measurePoints[1], measurePoints[0]];
            const diff = vec3.sub(vec3.create(), pts[0], pts[1]);

            renderMeasurePoints(view, measurePoints, "brepDistance", "measure", {
                textName: "distanceText",
                distance: vec3.len(diff),
            });

            pts = [
                pts[0],
                vec3.fromValues(pts[1][0], pts[0][1], pts[0][2]),
                vec3.fromValues(pts[1][0], pts[0][1], pts[1][2]),
                pts[1],
            ];

            renderMeasurePoints(view, [pts[0], pts[1]], "brepPathX", undefined, {
                textName: "brepTextX",
                distance: Math.abs(diff[0]),
            });
            renderMeasurePoints(view, [pts[1], pts[2]], "brepPathY", undefined, {
                textName: "brepTextY",
                distance: Math.abs(diff[2]),
            });
            renderMeasurePoints(view, [pts[2], pts[3]], "brepPathZ", undefined, {
                textName: "brepTextZ",
                distance: Math.abs(diff[1]),
            });

            const planarDiff = vec2.len(vec2.fromValues(diff[0], diff[2]));
            const pdPt1 = vec3.fromValues(pts[0][0], Math.min(pts[0][1], pts[3][1]), pts[0][2]);
            const pdPt2 = vec3.fromValues(pts[3][0], Math.min(pts[0][1], pts[3][1]), pts[3][2]);
            renderMeasurePoints(view, [pdPt1, pdPt2], "brepPathXZ", undefined, {
                textName: "brepTextXZ",
                distance: planarDiff,
            });
        } else {
        }
    }, [
        view,
        renderMeasureObject,
        renderMeasurePoints,
        renderSingleMeasurePoint,
        measureObjects,
        measure.duoMeasurementValues,
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

    const moveSvgCursor = useCallback(
        (x: number, y: number, measurement: MeasureInfo | undefined) => {
            if (!svg || !view) {
                return;
            }
            const g = svg.children.namedItem("cursor");
            if (!g) {
                return;
            }
            if (x < 0) {
                g.innerHTML = "";
                return;
            }
            const normal = measurement?.normalVS;
            if (normal) {
                const { width, height } = size;
                const { camera } = view;

                const angleX = (y / height - 0.5) * camera.fieldOfView;
                const angleY = ((x - width * 0.5) / height) * camera.fieldOfView;
                vec3.transformQuat(normal, normal, quat.fromEuler(quat.create(), angleX, angleY, 0));
                let style = "";
                if (normal[2] < 1) {
                    const rot = vec3.cross(vec3.create(), normal, vec3.fromValues(0, 0, 1));
                    vec3.normalize(rot, rot);
                    const angle = (Math.acos(normal[2]) * 180) / Math.PI;
                    style = `style="transform:rotate3d(${rot[0]},${-rot[1]},${rot[2]},${angle}deg)"`;
                }
                g.innerHTML = `<circle r="20" fill="rgba(255,255,255,0.25)" ${style}/><line x2="${(
                    normal[0] * 20
                ).toFixed(1)}" y2="${(normal[1] * -20).toFixed(
                    1
                )}" stroke="lightblue" stroke-width="2" stroke-linecap="round" />`;
            } else {
                g.innerHTML = `<path d="M-10,-10L10,10M-10,10L10,-10" stroke-width="2" stroke-linecap="round" stroke="${
                    measurement ? "lightgreen" : "red"
                }"/>`;
            }
            g.setAttribute("transform", `translate(${x},${y})`);
        },
        [svg, view, size]
    );

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            if (!measureScene) {
                return;
            }

            const mObjects = (await Promise.all(
                measure.selected.map((obj) =>
                    obj.id === -1
                        ? obj
                        : measureScene
                              .downloadMeasureObject(obj.id, obj.pos)
                              .then((_mObj) => {
                                  const mObj = _mObj as ExtendedMeasureObject;

                                  if (mObj.selectedEntity) {
                                      if (mObj.selectedEntity.kind === "vertex") {
                                          return { ...obj, pos: mObj.selectedEntity.parameter };
                                      }

                                      mObj.pos = obj.pos;
                                      mObj.settings = obj.settings;
                                  }

                                  return mObj.selectedEntity ? mObj : obj;
                              })
                              .catch(() => obj)
                )
            )) as (ExtendedMeasureObject | MeasurePoint)[];

            if (mObjects.length !== 2) {
                dispatch(measureActions.setDuoMeasurementValues(undefined));
                setMeasureObjects(mObjects);
                return;
            }

            const [obj1, obj2] = mObjects;

            let res: DuoMeasurementValues | undefined;

            if (obj1.selectedEntity && obj2.selectedEntity) {
                res = (await measureScene
                    .measure(obj1.selectedEntity!, obj2.selectedEntity, obj1.settings, obj2.settings)
                    .catch((e) => console.warn(e))) as DuoMeasurementValues | undefined;
            } else if (obj1.selectedEntity || obj2.selectedEntity) {
                const obj = obj1.selectedEntity ? obj1 : obj2;
                const pt = obj === obj1 ? obj2 : obj1;
                res = (await measureScene.measureToPoint(obj.selectedEntity, pt.pos, obj.settings)) as
                    | DuoMeasurementValues
                    | undefined;
            } else {
                res = measureScene.pointToPoint(obj1.pos, obj2.pos) as DuoMeasurementValues | undefined;
            }

            dispatch(measureActions.setDuoMeasurementValues(res));
            setMeasureObjects(mObjects);
        }
    }, [measureScene, setMeasureObjects, measure.selected, dispatch]);

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
                const sceneResponse = preloadedScene ?? (await dataApi.loadScene(id));

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
                settings.background = { color: vec4.fromValues(0, 0, 0, 0) };
                const _view = await api.createView(undefined, canvas);

                _view.applySettings({
                    ...settings,
                    quality: {
                        detail: {
                            ..._view.settings.quality.detail,
                            value: 1,
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

                onInit({ customProperties });
                initAdvancedSettings(_view, customProperties);
                initProjectSettings({ sceneData: sceneResponse });

                dispatchGlobals(
                    explorerGlobalsActions.update({
                        view: _view,
                        scene: _view.scene,
                        preloadedScene: undefined,
                        measureScene,
                    })
                );
            } catch (e) {
                console.warn(e);
                setStatus(Status.Error);
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
        preloadedScene,
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
                }
            } else if (cameraState.type === CameraType.Orthographic && cameraState.params) {
                // copy non-primitives
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

                const orthoController = api.createCameraController(safeParams, canvas);
                controller.enabled = false;
                view.camera.controller = orthoController;
            }
        },
        [cameraState, view, canvas, dispatch]
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
                setStatus(Status.Initial);
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
                initAdvancedSettings(view, customProperties);
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

    const exitPointerLock = () => {
        if ("exitPointerLock" in window.document) {
            window.document.exitPointerLock();
        }
    };

    const handleClick = async (e: MouseEvent | PointerEvent) => {
        if (!view || clippingBox.defining) {
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

        if (clippingPlanes.defining) {
            const { normal, position } = result;

            if (!normal) {
                return;
            }

            const w = -vec3.dot(normal, position);

            dispatch(
                renderActions.setClippingPlanes({
                    defining: false,
                    planes: [vec4.fromValues(normal[0], normal[1], normal[2], w)],
                    baseW: w,
                })
            );
            moveSvgCursor(-100, -100, undefined);
            return;
        }

        if (selectingOrthoPoint) {
            if (!canvas) {
                return;
            }

            const normal = result.normal.some((n) => Number.isNaN(n)) ? undefined : result.normal;

            const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
            (orthoController as any).init(result.position, normal, view.camera);
            flightController.current = view.camera.controller;
            flightController.current.enabled = false;

            view.camera.controller = orthoController;
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic }));
            dispatch(renderActions.setSelectingOrthoPoint(false));
            (orthoController as any).near = -0.001;

            const mat = (orthoController.params as any).referenceCoordSys;
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

            return;
        }

        if (measure.selecting) {
            dispatch(measureActions.selectObj({ id: measure.forcePoint ? -1 : result.objectId, pos: result.position }));
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
    };

    const handleDown = async (x: number, y: number) => {
        if (!view) {
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
        if (!view || !canvas || (!e.movementY && !e.movementX)) {
            return;
        }

        const useSvgCursor = (measure.selecting || clippingPlanes.defining || selectingOrthoPoint) && e.buttons === 0;

        if (useSvgCursor) {
            const measurement = await rendering.current.measure(
                e.nativeEvent.offsetX * devicePixelRatio,
                e.nativeEvent.offsetY * devicePixelRatio
            );
            canvas.style.cursor = "none";

            moveSvgCursor(e.nativeEvent.offsetX, e.nativeEvent.offsetY, measurement);

            return;
        } else {
            moveSvgCursor(-100, -100, undefined);
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
            {status === Status.Error ? (
                <NoScene id={id} />
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
                        onPointerOut={() => moveSvgCursor(-100, -100, undefined)}
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
                            {measureObjects
                                .sort((objA, objB) =>
                                    isMeasureObject(objA) && isMeasureObject(objB) ? 0 : isMeasureObject(objA) ? -1 : 1
                                )
                                .map((obj) =>
                                    isMeasureObject(obj) ? (
                                        <path
                                            key={getMeasureObjectPathId(obj)}
                                            id={getMeasureObjectPathId(obj)}
                                            d=""
                                            stroke="yellow"
                                            strokeWidth=""
                                            fill="none"
                                        />
                                    ) : (
                                        <MeasurementPoint
                                            key={getMeasureObjectPathId(obj)}
                                            id={getMeasureObjectPathId(obj)}
                                            r={5}
                                            disabled={true}
                                            fill="blue"
                                        />
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
                                    />
                                    <MeasurementPoint
                                        name={`normal end`}
                                        id={`normal_1`}
                                        r={5}
                                        disabled={true}
                                        fill="black"
                                    />
                                    <AxisText id={`normalDistanceText`} />
                                </>
                            ) : null}
                            {measure.duoMeasurementValues?.pointA && measure.duoMeasurementValues?.pointB ? (
                                <>
                                    <MeasurementPoint
                                        name={`measure start`}
                                        id={`measure_0`}
                                        r={5}
                                        disabled={true}
                                        fill="green"
                                    />
                                    <MeasurementPoint
                                        name={`measure end`}
                                        id={`measure_1`}
                                        r={5}
                                        disabled={true}
                                        fill="green"
                                    />
                                    <path id="brepDistance" d="" stroke="green" strokeWidth={2} fill="none" />
                                    <path id="brepPathX" d="" stroke="red" strokeWidth={2} fill="none" />
                                    <path id="brepPathY" d="" stroke="lightgreen" strokeWidth={2} fill="none" />
                                    <path id="brepPathZ" d="" stroke="blue" strokeWidth={2} fill="none" />
                                    <path id="brepPathXZ" d="" stroke="purple" strokeWidth={2} fill="none" />
                                    <AxisText id="brepTextX" />
                                    <AxisText id="brepTextY" />
                                    <AxisText id="brepTextZ" />
                                    <AxisText id="brepTextXZ" />
                                    <AxisText id={`distanceText`} />
                                </>
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

function NoScene({ id }: { id: string }) {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const msalAccount = useAppSelector(selectMsalAccount);

    const logOut = () => {
        deleteFromStorage(StorageKey.NovoToken);
        deleteFromStorage(StorageKey.MsalActiveAccount);

        if (msalInstance.getAllAccounts().length) {
            msalInstance.logoutRedirect({ account: msalAccount });
        } else {
            dispatch(authActions.logout());
        }
    };

    return (
        <Box
            bgcolor={theme.palette.secondary.main}
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={"100vh"}
        >
            <Paper>
                <Box minWidth={320} p={2}>
                    <Typography paragraph variant="h4" component="h1" align="center">
                        Unable to load scene
                    </Typography>
                    <Typography paragraph>
                        The scene with id <em>{id}</em> is not available.
                    </Typography>
                    <Box textAlign="center">
                        <Button onClick={logOut} variant="contained" color="secondary">
                            Log in with a different account
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

function getMeasureObjectPathId(obj: { id: number; pos: vec3 }): string {
    return obj.id + vec3.str(obj.pos);
}
