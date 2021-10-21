import { glMatrix, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";
import { useEffect, useState, useRef, MouseEvent, PointerEvent, useCallback, SVGProps } from "react";
import {
    View,
    API,
    FlightControllerParams,
    RenderSettings,
    EnvironmentDescription,
    Internal,
    MeasureInfo,
} from "@novorender/webgl-api";
import { SceneData } from "@novorender/data-js-api";
import type { API as DataAPI } from "@novorender/data-js-api";
import { Box, Button, Paper, Typography, useTheme, styled } from "@mui/material";
import { css } from "@mui/styled-engine";

import {
    fetchEnvironments,
    renderActions,
    RenderType,
    selectBaseCameraSpeed,
    selectCameraSpeedMultiplier,
    selectClippingPlanes,
    selectCurrentEnvironment,
    selectEnvironments,
    selectMainObject,
    selectMeasure,
    selectRenderType,
    selectSavedCameraPositions,
    selectSelectMultiple,
    selectDefaultVisibility,
} from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { PerformanceStats } from "features/performanceStats";
import { useMountedState } from "hooks/useMountedState";
import { authActions } from "slices/authSlice";
import { deleteStoredToken } from "utils/auth";
import { Loading } from "components";

import {
    addConsoleDebugUtils,
    getEnvironmentDescription,
    serializeableObjectGroups,
    getRenderType,
    refillObjects,
    createRendering,
} from "./utils";
import { xAxis, yAxis, axis, showPerformance } from "./consts";
import { useHighlighted, highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useHidden, hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { useCustomGroups, customGroupsActions } from "contexts/customGroups";

glMatrix.setMatrixArrayType(Array);
addConsoleDebugUtils();

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
    id: string;
    api: API;
    dataApi: DataAPI;
    onInit: (params: { view: View; customProperties: unknown }) => void;
};

let preloadedScene: SceneData | undefined;

export function SetPreloadedScene(scene: SceneData) {
    preloadedScene = scene;
}

export function Render3D({ id, api, onInit, dataApi }: Props) {
    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const hiddenObjects = useHidden();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();

    const env = useAppSelector(selectCurrentEnvironment);
    const environments = useAppSelector(selectEnvironments);
    const mainObject = useAppSelector(selectMainObject);

    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const cameraSpeedMultiplier = useAppSelector(selectCameraSpeedMultiplier);
    const baseCameraSpeed = useAppSelector(selectBaseCameraSpeed);
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const selectMultiple = useAppSelector(selectSelectMultiple);
    const renderType = useAppSelector(selectRenderType);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const measure = useAppSelector(selectMeasure);
    const { addingPoint, angles, points, distances, selected: selectedPoint } = measure;
    const dispatch = useAppDispatch();

    const rendering = useRef({ start: () => Promise.resolve(), stop: () => {} });
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const previousId = useRef("");
    const camera2pointDistance = useRef(0);
    const pointerDown = useRef(false);
    const camX = useRef(vec3.create());
    const camY = useRef(vec3.create());
    const [size, setSize] = useState({ width: 0, height: 0 });

    const [canvas, setCanvas] = useState<null | HTMLCanvasElement>(null);
    const [svg, setSvg] = useState<null | SVGSVGElement>(null);
    const [status, setStatus] = useMountedState(Status.Initial);
    const [view, setView] = useMountedState<View | undefined>(undefined);
    const scene = view?.scene;

    const moveSvg = useCallback(() => {
        if (!svg || !view) {
            return;
        }
        const numP = points.length;
        if (numP < 1) {
            // svg.innerHTML = "";
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
        const vsPoints = points.map((p) => {
            return vec3.transformMat4(vec3.create(), p, camMatrix);
        });
        const lastP = vsPoints[numP - 1];
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
    }, [svg, view, points, distances, angles, size]);

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
    }, [api, dispatch, environments]);

    useEffect(() => {
        initView();

        async function initView() {
            if (previousId.current === id || !canvas || !environments.length) {
                return;
            }

            previousId.current = id;

            try {
                const {
                    url,
                    db,
                    camera,
                    objectGroups = [],
                    bookmarks = [],
                    customProperties,
                    title,
                    ...sceneData
                } = preloadedScene ?? (await dataApi.loadScene(id));

                const settings = sceneData.settings ?? ({} as Partial<RenderSettings>);
                const { display: _display, ...customSettings } = settings ?? {};
                customSettings.background = { color: vec4.fromValues(0, 0, 0, 0) };
                const _view = await api.createView(customSettings, canvas);
                _view.applySettings({
                    quality: {
                        ..._view.settings.quality,
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
                const controller = api.createCameraController(
                    (camera as Required<FlightControllerParams>) ?? { kind: "flight" },
                    canvas
                );

                if (camera) {
                    controller.autoZoomToScene = false;
                }

                _view.camera.controller = controller;
                cameraGeneration.current = _view.performanceStatistics.cameraGeneration;

                if (window.self === window.top || !customProperties?.enabledFeatures?.transparentBackground) {
                    const initialEnvironment =
                        typeof settings.environment === "string"
                            ? getEnvironmentDescription(settings.environment, environments)
                            : (settings.environment as unknown as EnvironmentDescription) ??
                              getEnvironmentDescription("", environments);
                    dispatch(renderActions.setEnvironment(initialEnvironment));
                }

                dispatch(renderActions.setBookmarks(bookmarks));

                const defaultGroup = objectGroups.find((group) => !group.id && group.selected);
                if (defaultGroup) {
                    dispatchHighlighted(
                        highlightActions.set({
                            ids: defaultGroup.ids as number[],
                            color: [defaultGroup.color[0], defaultGroup.color[1], defaultGroup.color[2]],
                        })
                    );

                    const lastHighlighted = defaultGroup.ids.slice(-1)[0];
                    if (lastHighlighted) {
                        dispatch(renderActions.setMainObject(lastHighlighted));
                    }
                }

                const defaultHiddenGroup = objectGroups.find((group) => !group.id && group.hidden);
                if (defaultHiddenGroup) {
                    dispatchHidden(hiddenGroupActions.setIds(defaultHiddenGroup.ids as number[]));
                }

                const customGroups = objectGroups.filter((group) => group.id);
                if (customGroups.length) {
                    dispatchCustomGroups(customGroupsActions.set(serializeableObjectGroups(customGroups)));
                }

                setView(_view);
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

                onInit({ view: _view, customProperties });
                preloadedScene = undefined;
            } catch (e) {
                setStatus(Status.Error);
            }
        }
    }, [
        canvas,
        view,
        api,
        dataApi,
        dispatch,
        onInit,
        environments,
        id,
        setView,
        setStatus,
        dispatchCustomGroups,
        dispatchHidden,
        dispatchHighlighted,
        setSize,
    ]);

    useEffect(() => {
        if (!view) {
            return;
        }

        dispatchRenderType(view);

        async function dispatchRenderType(view: View) {
            const type = await getRenderType(view);
            dispatch(renderActions.setRenderType(type));
        }
    }, [view, dispatch]);

    useEffect(
        function initCameraMovedTracker() {
            if (!view) {
                return;
            }

            cameraMoved(view);

            function cameraMoved(view: View) {
                if ((window as any).Cypress) {
                    (window as any).appFullyRendered =
                        view.performanceStatistics.sceneResolved && view.performanceStatistics.renderResolved;
                }

                if (cameraGeneration.current !== view.performanceStatistics.cameraGeneration) {
                    cameraGeneration.current = view.performanceStatistics.cameraGeneration ?? 0;

                    moveSvg();

                    if (movementTimer.current) {
                        clearTimeout(movementTimer.current);
                    }

                    movementTimer.current = setTimeout(() => {
                        if (!view) {
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
        [api, view, moveSvg, dispatch, savedCameraPositions]
    );

    useEffect(
        function handleObjectHighlightChanges() {
            if (scene && view) {
                refillObjects({
                    scene,
                    view,
                    objectGroups: [
                        { ...hiddenObjects, hidden: true, selected: false, color: [0, 0, 0] },
                        ...customGroups,
                        { ...highlightedObjects, hidden: false, selected: true },
                    ],
                    defaultVisibility,
                });
            }
        },
        [scene, view, api, defaultVisibility, mainObject, customGroups, highlightedObjects, hiddenObjects]
    );

    useEffect(
        function handleRenderTypeChanges() {
            if (!view || !("advanced" in view.settings)) {
                return;
            }

            const settings = view.settings as Internal.RenderSettingsExt;

            settings.advanced.hidePoints = renderType === RenderType.Triangles;
            settings.advanced.hideTriangles = renderType === RenderType.Points;
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
        [env, api, view]
    );

    useEffect(
        function handleClippingChanges() {
            if (!view) {
                return;
            }

            view.applySettings({ clippingPlanes: { ...clippingPlanes, bounds: view.settings.clippingPlanes.bounds } });
        },
        [view, clippingPlanes]
    );

    useEffect(
        function cleanUpPreviousScene() {
            return () => {
                rendering.current.stop();
                window.removeEventListener("blur", exitPointerLock);
                setView(undefined);
                dispatch(renderActions.resetState());
                setStatus(Status.Initial);
            };
        },
        [id, dispatch, setStatus, setView]
    );

    const exitPointerLock = () => {
        if ("exitPointerLock" in window.document) {
            window.document.exitPointerLock();
        }
    };

    const handleClick = async (e: React.MouseEvent) => {
        if (!view || clippingPlanes.defining) {
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

        const alreadySelected = highlightedObjects.ids.includes(result.objectId);

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
            if (alreadySelected && highlightedObjects.ids.length === 1) {
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

        if (clippingPlanes.defining) {
            view.camera.controller.enabled = false;
            const tan = Math.tan(0.5 * glMatrix.toRadian(fieldOfView));
            const size = 0.25 * tan * camera2pointDistance.current;
            const bounds = {
                min: vec3.fromValues(point[0] - size, point[1] - size, point[2] - size),
                max: vec3.fromValues(point[0] + size, point[1] + size, point[2] + size),
            };

            view.applySettings({ clippingPlanes: { ...clippingPlanes, bounds } });
        } else if (result.objectId > 0xfffffffe || result.objectId < 0xfffffff9) {
            camera2pointDistance.current = 0;
        } else if (clippingPlanes.enabled && clippingPlanes.showBox) {
            view.camera.controller.enabled = false;

            const highlight = 0xfffffffe - result.objectId;

            dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, highlight }));
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

        if (camera2pointDistance.current > 0 && clippingPlanes.defining) {
            dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, defining: false }));
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
        if ((addingPoint && e.buttons === 0) || selectedPoint > -1) {
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
            !clippingPlanes.enabled ||
            !clippingPlanes.showBox ||
            camera2pointDistance.current === 0
        ) {
            return;
        }

        const activeSide = clippingPlanes.highlight;

        if (activeSide === -1 && !clippingPlanes.defining) {
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

        if (clippingPlanes.defining) {
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
                    renderActions.setClippingPlanes({
                        ...clippingPlanes,
                        highlight: activeSide > 2 ? axisIdx : axisIdx + 3,
                    })
                );
            }
        }

        view.applySettings({ clippingPlanes: { ...clippingPlanes, bounds: { min, max } } });
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
        <Box position="relative" width="100%" height="100%">
            {status === Status.Error ? (
                <NoScene id={id} />
            ) : (
                <>
                    {showPerformance && view && canvas ? <PerformanceStats view={view} canvas={canvas} /> : null}
                    <Canvas
                        tabIndex={1}
                        ref={setCanvas}
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
        deleteStoredToken();
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
