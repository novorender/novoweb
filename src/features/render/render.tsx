import { glMatrix, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";
import { useEffect, useState, useRef, MouseEvent, PointerEvent, useCallback, SVGProps, RefCallback } from "react";
import { SceneData } from "@novorender/data-js-api";
import {
    View,
    Scene,
    EnvironmentDescription,
    Internal,
    MeasureInfo,
    CameraController,
    OrthoControllerParams,
    CameraControllerParams,
    DynamicObject,
} from "@novorender/webgl-api";
import { Box, Button, Paper, Typography, useTheme, styled } from "@mui/material";
import { css } from "@mui/styled-engine";
import { CameraAlt } from "@mui/icons-material";

import { PerformanceStats } from "features/performanceStats";
import { getDataFromUrlHash } from "features/shareLink";
import {
    panoramasActions,
    selectActivePanorama,
    selectPanoramas,
    selectShow3dMarkers,
    PanoramaType,
    PanoramaStatus,
    selectPanoramaStatus,
} from "features/panoramas";
import { Loading } from "components";

import { api, dataApi } from "app";
import { StorageKey } from "config/storage";
import { useMountedState } from "hooks/useMountedState";
import { useSceneId } from "hooks/useSceneId";
import { useAbortController } from "hooks/useAbortController";
import { deleteFromStorage } from "utils/storage";
import { enabledFeaturesToFeatureKeys, getEnabledFeatures } from "utils/misc";
import { sleep } from "utils/timers";

import {
    fetchEnvironments,
    renderActions,
    RenderType,
    selectBaseCameraSpeed,
    selectCameraSpeedMultiplier,
    selectClippingBox,
    selectCurrentEnvironment,
    selectEnvironments,
    selectMainObject,
    selectMeasure,
    selectRenderType,
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
} from "slices/renderSlice";
import { authActions } from "slices/authSlice";
import { explorerActions, selectUrlBookmarkId } from "slices/explorerSlice";
import { selectDeviations } from "features/deviations";
import { bookmarksActions, selectBookmarks, useSelectBookmark } from "features/bookmarks";
import { useAppDispatch, useAppSelector } from "app/store";

import { useHighlighted, highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useHidden, useDispatchHidden } from "contexts/hidden";
import { useCustomGroups } from "contexts/customGroups";
import { useDispatchVisible, useVisible, visibleActions } from "contexts/visible";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";

import {
    getRenderType,
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
} from "./utils";
import { xAxis, yAxis, axis } from "./consts";
import { featuresConfig, WidgetKey } from "config/features";

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

const DistanceText = styled("text")(
    () => css`
        text-anchor: middle;
        fill: white;
        font-size: 16px;
        font-weight: bold;
        user-select: none;
    `
);

const AxisText = styled((props: SVGProps<SVGTextElement>) => <text alignmentBaseline="middle" {...props} />)(
    () => css`
        fill: white;
        font-size: 14px;
        user-select: none;
    `
);

enum Status {
    Initial,
    Error,
}

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
        state: { view, scene, canvas, preloadedScene },
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
    const renderType = useAppSelector(selectRenderType);
    const selectionBasketMode = useAppSelector(selectSelectionBasketMode);
    const clippingBox = useAppSelector(selectClippingBox);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const cameraState = useAppSelector(selectCamera);
    const selectingOrthoPoint = useAppSelector(selectSelectiongOrthoPoint);
    const advancedSettings = useAppSelector(selectAdvancedSettings);
    const measure = useAppSelector(selectMeasure);
    const { addingPoint, angles, points, distances, selected: selectedPoint } = measure;
    const panoramas = useAppSelector(selectPanoramas);
    const deviation = useAppSelector(selectDeviations);
    const show3dMarkers = useAppSelector(selectShow3dMarkers);
    const activePanorama = useAppSelector(selectActivePanorama);
    const panoramaStatus = useAppSelector(selectPanoramaStatus);
    const urlBookmarkId = useAppSelector(selectUrlBookmarkId);
    const dispatch = useAppDispatch();

    const rendering = useRef({ start: () => Promise.resolve(), stop: () => {}, update: () => {} } as ReturnType<
        typeof createRendering
    >);
    const currentPanoramaObj = useRef<{ id: string; obj: DynamicObject }>();
    const storedRenderType = useRef<typeof renderType>(renderType);
    const storedMouseButtonsMap = useRef<CameraController["mouseButtonsMap"]>({
        rotate: 1,
        pan: 4,
        orbit: 2,
        pivot: 2,
    });
    const storedFingersMap = useRef<CameraController["fingersMap"]>({ rotate: 1, pan: 2, orbit: 3, pivot: 3 });
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const previousId = useRef("");
    const camera2pointDistance = useRef(0);
    const flightController = useRef<CameraController>();
    const pointerDown = useRef(false);
    const camX = useRef(vec3.create());
    const camY = useRef(vec3.create());
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [panoramaAbortController, abortPanorama] = useAbortController();

    const [svg, setSvg] = useState<null | SVGSVGElement>(null);
    const [status, setStatus] = useMountedState(Status.Initial);

    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    const moveSvg = useCallback(() => {
        if (!svg || !view) {
            return;
        }
        const numPts = points.length;

        if (numPts < 1 && !panoramas?.length) {
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
            return vec2.fromValues(((_p[0] * 0.5) / _p[3] + 0.5) * width, (0.5 - (_p[1] * 0.5) / _p[3]) * height);
        };
        const clip = (p: vec3, p0: vec3) => {
            const d = vec3.sub(vec3.create(), p0, p);
            vec3.scale(d, d, (-camera.near - p[2]) / d[2]);
            return vec3.add(d, d, p);
        };

        if (panoramas?.length) {
            const vsPans = panoramas.map((p) => vec3.transformMat4(vec3.create(), p.position, camMatrix));

            vsPans.forEach((pos, idx) => {
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

        if (numPts >= 1) {
            const vsPoints = points.map((p) => {
                return vec3.transformMat4(vec3.create(), p, camMatrix);
            });
            const lastP = vsPoints[numPts - 1];
            const lastPs = toScreen(lastP);

            angles.forEach((a, i) => {
                const g = svg.children.namedItem(`angle ${i}`);
                if (!g) {
                    return;
                }
                const _p = vsPoints[i + 1];
                if (_p[2] > 0) {
                    g.innerHTML = "";
                    return;
                }
                let _p0 = vsPoints[i];
                let _p1 = vsPoints[i + 2];
                if (_p0[2] > 0) {
                    _p0 = clip(_p, _p0);
                }
                if (_p1[2] > 0) {
                    _p1 = clip(_p, _p1);
                }
                const p = toScreen(_p);
                const p0 = toScreen(_p0);
                const p1 = toScreen(_p1);
                const d0 = vec2.sub(vec2.create(), p0, p);
                const d1 = vec2.sub(vec2.create(), p1, p);
                const l0 = vec2.len(d0);
                const l1 = vec2.len(d1);
                if (l0 < 40 || l1 < 40) {
                    g.innerHTML = "";
                    return;
                }
                vec2.scale(d0, d0, 1 / l0);
                vec2.scale(d1, d1, 1 / l1);
                const sw = d0[0] * d1[1] - d0[1] * d1[0] > 0 ? 1 : 0;
                const text = +a.toFixed(1) + "°";
                const dir = vec2.add(vec2.create(), d1, d0);
                const dirLen = vec2.len(dir);
                if (dirLen < 0.001) {
                    vec2.set(dir, 0, 1);
                } else {
                    vec2.scale(dir, dir, 1 / dirLen);
                }
                const angle = (Math.asin(dir[1]) * 180) / Math.PI;
                g.innerHTML = `<path d="M ${p[0] + d0[0] * 20} ${p[1] + d0[1] * 20} A 20 20, 0, 0, ${sw}, ${
                    p[0] + d1[0] * 20
                } ${p[1] + d1[1] * 20}" stroke="blue" fill="transparent" stroke-width="2" stroke-linecap="square" />
                        <text text-anchor=${
                            dir[0] < 0 ? "end" : "start"
                        } alignment-baseline="central" fill="white" x="${p[0] + dir[0] * 25}" y="${
                    p[1] + dir[1] * 25
                }" transform="rotate(${dir[0] < 0 ? -angle : angle} ${p[0] + dir[0] * 25},${
                    p[1] + dir[1] * 25
                })">${text}</text>`;
            });
            if (vsPoints.length > 1) {
                const path = svg.children.namedItem("path");
                if (path) {
                    path.setAttribute(
                        "d",
                        vsPoints
                            .map((p, i) => {
                                if (p[2] > 0) {
                                    if (i === 0 || vsPoints[i - 1][2] > 0) {
                                        return "";
                                    }
                                    const p0 = clip(vsPoints[i - 1], p);
                                    const _p = toScreen(p0);
                                    return `L${_p[0]},${_p[1]}`;
                                }
                                const _p = toScreen(p);
                                if (i === 0) {
                                    return `M${_p[0]},${_p[1]}`;
                                }
                                if (vsPoints[i - 1][2] > 0) {
                                    const p0 = clip(p, vsPoints[i - 1]);
                                    const _p0 = toScreen(p0);
                                    return `M${_p0[0]},${_p0[1]}L${_p[0]},${_p[1]}`;
                                }
                                return `L${_p[0]},${_p[1]}`;
                            })
                            .join(" ")
                    );
                }
                if (vsPoints.length === 2) {
                    const pathX = svg.children.namedItem("pathX");
                    const pathY = svg.children.namedItem("pathY");
                    const pathZ = svg.children.namedItem("pathZ");
                    const textX = svg.children.namedItem("textX") as HTMLElement;
                    const textY = svg.children.namedItem("textY") as HTMLElement;
                    const textZ = svg.children.namedItem("textZ") as HTMLElement;
                    if (pathX && pathY && pathZ && textX && textY && textZ) {
                        let pts = points[0][1] < points[1][1] ? [points[0], points[1]] : [points[1], points[0]];
                        const diff = vec3.sub(vec3.create(), pts[0], pts[1]);
                        pts = [
                            pts[0],
                            vec3.fromValues(pts[1][0], pts[0][1], pts[0][2]),
                            vec3.fromValues(pts[1][0], pts[0][1], pts[1][2]),
                            pts[1],
                        ];
                        let centers: vec3[] = [];
                        for (let i = 0; i < 3; i++) {
                            const v = vec3.add(vec3.create(), pts[i], pts[i + 1]);
                            centers.push(vec3.scale(v, v, 0.5));
                        }
                        const getOut = (center: vec3, d0: vec3, d1: vec3, up: vec3) => {
                            const out = vec3.subtract(vec3.create(), d0, d1);
                            vec3.cross(out, out, up);
                            vec3.normalize(out, out);
                            return vec3.add(out, out, center);
                        };
                        const cam2Z = vec3.subtract(vec3.create(), centers[2], camera.position);
                        vec3.normalize(cam2Z, cam2Z);
                        let outs = [
                            getOut(centers[0], pts[0], pts[1], vec3.fromValues(0, 1, 0)),
                            getOut(centers[1], pts[1], pts[2], vec3.fromValues(0, 1, 0)),
                            getOut(centers[2], pts[2], pts[3], cam2Z),
                        ];
                        pts = pts.map((p) => {
                            return vec3.transformMat4(vec3.create(), p, camMatrix);
                        });
                        centers = centers.map((p) => {
                            return vec3.transformMat4(vec3.create(), p, camMatrix);
                        });
                        outs = outs.map((p) => {
                            return vec3.transformMat4(vec3.create(), p, camMatrix);
                        });
                        const getD = (
                            p0: vec3,
                            p1: vec3,
                            o: vec3,
                            center: vec3,
                            out: vec3,
                            text: HTMLElement,
                            d: number
                        ) => {
                            if (p0[2] > 0 && p1[2] > 0) {
                                text.innerHTML = "";
                                return "";
                            }
                            if (p0[2] > 0) {
                                p0 = clip(p1, p0);
                            } else if (p1[2] > 0) {
                                p1 = clip(p0, p1);
                            }
                            const _p0 = toScreen(p0);
                            const _p1 = toScreen(p1);
                            const _o = toScreen(o);
                            const _text = `${+d.toFixed(3)} m`;
                            let dir =
                                _p0[1] > _p1[1] ? vec2.sub(vec2.create(), _p0, _p1) : vec2.sub(vec2.create(), _p1, _p0);
                            const pixLen = /*_text.length * 12 +*/ 20;
                            if (vec2.sqrLen(dir) > pixLen * pixLen) {
                                const _center = toScreen(center);
                                const _out = toScreen(out);
                                const off = vec2.create();
                                vec2.normalize(dir, dir);
                                vec2.normalize(off, vec2.sub(off, _out, _center));
                                const perp = vec3.fromValues(0, 0, -1);
                                vec3.normalize(perp, vec3.cross(perp, perp, vec3.fromValues(dir[0], dir[1], 0)));
                                if (vec2.dot(vec2.fromValues(perp[0], perp[1]), vec2.sub(_o, _o, _p0)) > 0) {
                                    vec3.scale(perp, perp, -1);
                                }
                                // vec2.set(off, perp[0], perp[1]);
                                let dot = vec2.dot(vec2.fromValues(perp[0], perp[1]), off);
                                if (dot < 0) {
                                    vec2.scale(off, off, -1);
                                    dot = -dot;
                                }
                                dot = Math.acos(dot) - Math.PI * 0.25;
                                if (dot > 0) {
                                    vec2.normalize(
                                        off,
                                        vec2.lerp(off, off, vec2.fromValues(perp[0], perp[1]), (dot * 4) / Math.PI)
                                    );
                                }
                                const skew = (Math.asin(vec2.dot(dir, off)) * 180 * Math.sign(perp[0])) / Math.PI;
                                const sign = Math.sign(off[0]);
                                const angle = (Math.asin(off[1]) * 180 * sign) / Math.PI;
                                vec2.scale(off, off, 5);
                                text.setAttribute(
                                    "transform",
                                    `translate(${(_center[0] + off[0]).toFixed(1)},${(_center[1] + off[1]).toFixed(
                                        1
                                    )}) rotate(${angle.toFixed(1)}) skewX(${skew.toFixed(1)})`
                                );
                                text.innerHTML = _text;
                                text.style.textAnchor = sign < 0 ? "end" : "start";
                            } else {
                                text.innerHTML = "";
                            }
                            return `M${_p0[0]},${_p0[1]}L${_p1[0]},${_p1[1]}`;
                        };
                        pathX.setAttribute(
                            "d",
                            getD(pts[0], pts[1], pts[3], centers[0], outs[0], textX, Math.abs(diff[0]))
                        );
                        pathY.setAttribute(
                            "d",
                            getD(
                                pts[1],
                                pts[2],
                                pts[0], //vec3.lerp(vec3.create(), pts[0], pts[3], 0.5),
                                centers[1],
                                outs[1],
                                textY,
                                Math.abs(diff[2])
                            )
                        );
                        pathZ.setAttribute(
                            "d",
                            getD(pts[2], pts[3], pts[0], centers[2], outs[2], textZ, Math.abs(diff[1]))
                        );
                    }
                }
            }
            vsPoints.forEach((_p, i) => {
                const circle = svg.children.namedItem(i.toString());
                // const circle = svg.children.namedItem(`dot ${i}`);
                if (!circle) {
                    return;
                }
                if (_p[2] > 0) {
                    circle.setAttribute("cx", "-10");
                    return;
                }
                const p = toScreen(_p);
                circle.id = i.toString();
                circle.setAttribute("cx", p[0].toFixed(1));
                circle.setAttribute("cy", p[1].toFixed(1));
            });
            {
                const circle = svg.children.namedItem("lastDot");
                if (circle) {
                    if (lastP[2] <= 0) {
                        circle.setAttribute("cx", lastPs[0].toFixed(1));
                        circle.setAttribute("cy", lastPs[1].toFixed(1));
                    } else {
                        circle.setAttribute("cx", "-10");
                    }
                }
            }
            distances.forEach((d, i) => {
                const text = svg.children.namedItem(`text ${i}`);
                if (!text) {
                    return;
                }
                const _p0 = vsPoints[i];
                const _p1 = vsPoints[i + 1];
                if (_p0[2] > 0 && _p1[2] > 0) {
                    text.innerHTML = "";
                    return;
                }
                const p0 = toScreen(_p0[2] > 0 ? clip(_p1, _p0) : _p0);
                const p1 = toScreen(_p1[2] > 0 ? clip(_p0, _p1) : _p1);
                const _text = `${+d.toFixed(3)} m`;
                let dir = p0[0] > p1[0] ? vec2.sub(vec2.create(), p0, p1) : vec2.sub(vec2.create(), p1, p0);
                const pixLen = _text.length * 12 + 20;
                if (vec2.sqrLen(dir) > pixLen * pixLen) {
                    const angle = (Math.asin(dir[1] / vec2.len(dir)) * 180) / Math.PI;
                    const off = vec3.fromValues(0, 0, -1);
                    vec3.scale(off, vec3.normalize(off, vec3.cross(off, off, vec3.fromValues(dir[0], dir[1], 0))), 5);
                    const center = vec2.create();
                    vec2.lerp(center, p0, p1, 0.5);
                    text.setAttribute("x", (center[0] + off[0]).toFixed(1));
                    text.setAttribute("y", (center[1] + off[1]).toFixed(1));
                    text.setAttribute("transform", `rotate(${angle} ${center[0] + off[0]},${center[1] + off[1]})`);
                    text.innerHTML = _text;
                } else {
                    text.innerHTML = "";
                }
            });
        }
    }, [svg, view, points, distances, angles, size, panoramas]);

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

                // const camMatrix = mat4.fromRotationTranslation(mat4.create(), camera.rotation, camera.position);
                // mat4.invert(camMatrix, camMatrix);
                // const camDir = vec3.transformMat4(vec3.create(), measurement.position, camMatrix);
                // vec3.normalize(camDir, camDir);
                // const _angleX = (Math.asin(camDir[1]) * -180) / Math.PI;
                // const _angleY = (Math.asin(camDir[0]) * 180) / Math.PI;

                const angleX = (y / height - 0.5) * camera.fieldOfView;
                const angleY = ((x - width * 0.5) / height) * camera.fieldOfView;
                // const n = vec3.transformQuat(vec3.create(), normal, quat.fromEuler(quat.create(), _angleX, _angleY, 0));
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
                const _view = await api.createView(settings, canvas);
                _view.applySettings({
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

                initCamera({
                    canvas,
                    camera,
                    view: _view,
                    flightControllerRef: flightController,
                });

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
                        canvas.width = entry.contentRect.width * window.devicePixelRatio;
                        canvas.height = entry.contentRect.height * window.devicePixelRatio;
                        _view.applySettings({
                            display: { width: entry.contentRect.width, height: entry.contentRect.height },
                        });
                        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
                    }
                });

                resizeObserver.observe(canvas);

                onInit({ customProperties });
                initAdvancedSettings(_view, customProperties);

                dispatchGlobals(
                    explorerGlobalsActions.update({
                        view: _view,
                        scene: _view.scene,
                        preloadedScene: undefined,
                    })
                );
            } catch (e) {
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

        initRenderType(view, scene);

        async function initRenderType(view: View, scene: Scene) {
            const initialRenderType = await getRenderType(view, scene);
            dispatch(renderActions.setRenderType(initialRenderType));

            const toDisable = Object.values(featuresConfig)
                .filter((feature) => {
                    if ("dependencies" in feature && feature.dependencies.renderType) {
                        return !feature.dependencies.renderType.some((type) =>
                            Array.isArray(type) && Array.isArray(initialRenderType)
                                ? type[0] === initialRenderType[0] && type[1] === initialRenderType[1]
                                : type === initialRenderType
                        );
                    }

                    return false;
                })
                .map((feature) => feature.key);

            dispatch(explorerActions.disableWidgets(toDisable as WidgetKey[]));
        }
    }, [view, scene, dispatch]);

    useEffect(
        function initCameraMovedTracker() {
            if (!view) {
                return;
            }

            cameraMoved(view);

            function cameraMoved(view: View) {
                if (window.Cypress) {
                    window.appFullyRendered =
                        view.performanceStatistics.sceneResolved && view.performanceStatistics.renderResolved;
                }

                if (cameraGeneration.current !== view.performanceStatistics.cameraGeneration) {
                    cameraGeneration.current = view.performanceStatistics.cameraGeneration ?? 0;

                    moveSvg();
                    rendering.current.update({ moving: true });

                    if (movementTimer.current) {
                        clearTimeout(movementTimer.current);
                    }

                    movementTimer.current = setTimeout(() => {
                        if (
                            !view ||
                            cameraState.type === CameraType.Orthographic ||
                            renderType === RenderType.Panorama
                        ) {
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

            api.animate = () => cameraMoved(view);
        },
        [view, moveSvg, dispatch, savedCameraPositions, cameraState, advancedSettings, renderType]
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
                        { id: "", ids: visibleObjects.idArr, hidden: false, selected: true, neutral: true },
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
        ]
    );

    useEffect(
        function handleRenderTypeChanges() {
            if (!view || !("advanced" in view.settings) || renderType === RenderType.Uninitialised) {
                return;
            }

            if (renderType !== RenderType.Panorama) {
                storedRenderType.current = renderType;
                view.camera.controller.mouseButtonsMap = storedMouseButtonsMap.current;
                view.camera.controller.fingersMap = storedFingersMap.current;
            } else {
                storedMouseButtonsMap.current = view.camera.controller.mouseButtonsMap;
                storedFingersMap.current = view.camera.controller.fingersMap;
                view.camera.controller.mouseButtonsMap = { pan: 0, rotate: 1, pivot: 0, orbit: 0 };
                view.camera.controller.fingersMap = { pan: 0, rotate: 1, pivot: 0, orbit: 0 };
            }

            const settings = view.settings as Internal.RenderSettingsExt;

            settings.advanced.hidePoints =
                renderType === RenderType.Triangles ||
                renderType === RenderType.Panorama ||
                (Array.isArray(renderType) && renderType[1] === "triangles");

            settings.advanced.hideTriangles =
                renderType === RenderType.Points ||
                renderType === RenderType.Panorama ||
                (Array.isArray(renderType) && renderType[1] === "points");
        },
        [renderType, view]
    );

    useEffect(
        function handleCameraSpeedChanges() {
            if (!view || view.camera.controller.params.kind !== "flight") {
                return;
            }

            view.camera.controller.params.linearVelocity = baseCameraSpeed * cameraSpeedMultiplier;
            canvas?.focus();
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

            (window as any).view = view;
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
                controller.enabled = true;
                view.camera.controller = controller;
                view.applySettings({ grid: { ...view.settings.grid, enabled: false } });

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
        [cameraState, view, canvas]
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

    useEffect(
        function handlePanoramaChanges() {
            if (!view || !scene) {
                return;
            }
            const currentObj = currentPanoramaObj.current;
            if (currentObj && currentObj.id !== activePanorama?.guid) {
                currentObj.obj.dispose();
                abortPanorama();
            }

            if (!activePanorama) {
                dispatch(renderActions.setRenderType(storedRenderType.current));
                abortPanorama();
            } else if (Array.isArray(panoramaStatus) && panoramaStatus[0] === PanoramaStatus.Loading) {
                loadPanorama(activePanorama, view, scene);
            }

            async function loadPanorama(panorama: PanoramaType, view: View, scene: Scene) {
                const abortSignal = panoramaAbortController.current.signal;
                dispatch(renderActions.setRenderType(storedRenderType.current));
                view.camera.controller.moveTo(panorama.position, panorama.rotation);

                let start = Date.now();
                if (view.camera.controller.params.kind === "flight") {
                    start += view.camera.controller.params.flightTime * 1000;
                }

                const url = new URL((scene as any).assetUrl);
                url.pathname += panorama.gltf;
                const asset = await api.loadAsset(url);

                if (!asset) {
                    return;
                }

                const delta = start - Date.now();
                if (delta > 0) {
                    await sleep(delta);
                }

                if (abortSignal.aborted) {
                    return;
                }

                const panoramaObj = scene.createDynamicObject(asset);
                currentPanoramaObj.current = { id: panorama.guid, obj: panoramaObj };
                panoramaObj.position = panorama.position;

                panoramaObj.visible = true;
                dispatch(panoramasActions.setStatus([PanoramaStatus.Active, panorama.guid]));
                dispatch(renderActions.setRenderType(RenderType.Panorama));
            }
        },
        [panoramas, activePanorama, scene, view, dispatch, panoramaStatus, panoramaAbortController, abortPanorama]
    );

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
            } catch {}
        }
    }, [view, id, dispatch, selectBookmark, urlBookmarkId]);

    const exitPointerLock = () => {
        if ("exitPointerLock" in window.document) {
            window.document.exitPointerLock();
        }
    };

    const handleClick = async (e: React.MouseEvent) => {
        if (!view || clippingBox.defining) {
            return;
        }

        const result = await view.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        if (!result || result.objectId > 0x1000000) {
            return;
        }

        if (addingPoint) {
            const points = measure.points.concat([result.position]);
            moveSvgCursor(-100, -100, undefined);
            dispatch(renderActions.setMeasurePoints(points));
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

            const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
            (orthoController as any).init(result.position, result.normal, view.camera);
            flightController.current = view.camera.controller;
            flightController.current.enabled = false;

            view.camera.controller = orthoController;
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic }));
            dispatch(renderActions.setSelectingOrthoPoint(false));

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
        const result = await view.pick(x, y);

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
            return;
        }

        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) {
            return;
        }

        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handleUp = () => {
        dispatch(renderActions.setMeasure({ ...measure, selected: -1 }));

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

        const useSvgCursor =
            ((addingPoint || clippingPlanes.defining || selectingOrthoPoint) && e.buttons === 0) || selectedPoint > -1;

        if (useSvgCursor) {
            const measurement = await view.measure(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

            canvas.style.cursor = "none";

            if (selectedPoint > -1) {
                moveSvgCursor(-100, -100, undefined);
                if (measurement) {
                    const points = measure.points.map((_, i) => (i !== selectedPoint ? _ : measurement.position));
                    dispatch(renderActions.setMeasurePoints(points));
                }
            } else {
                moveSvgCursor(e.nativeEvent.offsetX, e.nativeEvent.offsetY, measurement);
            }
            return;
        }

        moveSvgCursor(-100, -100, undefined);
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
    const numP = points.length;

    const selectPoint = (ev: React.MouseEvent<SVGCircleElement>) => {
        ev.stopPropagation();
        const selected = parseInt(ev.currentTarget.id);
        if (canvas && svg) {
            canvas.focus();
            view!.camera.controller.enabled = false;
        }
        dispatch(renderActions.setMeasure({ ...measure, selected }));
    };

    setTimeout(moveSvg, 1);

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
                    {canvas !== null && (
                        <Svg width={canvas.width} height={canvas.height} ref={setSvg}>
                            {angles.map((_, i) => {
                                return <g key={i} id={`angle ${i}`}></g>;
                            })}
                            {numP === 2 && (
                                <>
                                    <path id="pathX" d="" stroke="red" strokeWidth={1} fill="none" />
                                    <path id="pathY" d="" stroke="lightgreen" strokeWidth={1} fill="none" />
                                    <path id="pathZ" d="" stroke="blue" strokeWidth={1} fill="none" />
                                    <AxisText id="textX" />
                                    <AxisText id="textY" />
                                    <AxisText id="textZ" />
                                </>
                            )}
                            {numP > 1 && <path id="path" d="" stroke="green" strokeWidth={2} fill="none" />}
                            {points.map((_, i) => (
                                <MeasurementPoint
                                    name={`dot ${i}`}
                                    id={i.toString()}
                                    r={5}
                                    key={i}
                                    onMouseDown={selectPoint}
                                    disabled={selectedPoint >= 0}
                                />
                            ))}
                            {numP > 0 && <MeasurementPoint id="lastDot" r={3} stroke="none" fill="red" disabled />}
                            {distances.map((_, i) => (
                                <DistanceText id={`text ${i}`} key={i} />
                            ))}
                            <g id="cursor" />
                            {panoramas && show3dMarkers
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

    const logout = async () => {
        deleteFromStorage(StorageKey.NovoToken);
        dispatch(authActions.logout());
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
                        <Button onClick={logout} variant="contained" color="secondary">
                            Log in with a different account
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
