import { glMatrix, mat3, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";
import { useEffect, useState, useRef, MouseEvent, PointerEvent, useCallback, RefCallback } from "react";
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
import { useSelectBookmark } from "features/bookmarks";
import { measureActions, selectMeasure } from "features/measure";

import { manholeActions, useHandleManholeUpdates } from "features/manhole";
import { ditioActions, selectMarkers, selectShowMarkers } from "features/ditio";
import { useAppDispatch, useAppSelector } from "app/store";
import { followPathActions } from "features/followPath";
import { areaActions } from "features/area";
import { useHandleAreaPoints } from "features/area";
import { heightProfileActions } from "features/heightProfile";
import { pointLineActions, useHandlePointLineUpdates } from "features/pointLine";
import { selectCurrentLocation, useHandleLocationMarker } from "features/myLocation";
import { useHandleJiraKeepAlive } from "features/jira";

import { useHighlighted, highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useHidden, useDispatchHidden } from "contexts/hidden";
import { useObjectGroups, useDispatchObjectGroups } from "contexts/objectGroups";
import { useDispatchSelectionBasket, useSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";
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
import { getPathPoints, moveSvgCursor } from "./svgUtils";
import { Engine2D } from "features/engine2D";
import { MeasureEntity } from "@novorender/measure-api";
import { ExtendedMeasureEntity } from "types/misc";
import { useHoverSettings, usePickSettings } from "features/measure/useMeasureObjects";

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

const PanoramaMarker = styled((props: any) => <CameraAlt color="primary" height="50px" width="50px" {...props} />)(
    () => css`
        cursor: pointer;
        pointer-events: auto;
        filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
    `
);

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
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const selectionBasket = useSelectionBasket();
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { view, scene, canvas, measureScene, size },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();
    const selectBookmark = useSelectBookmark();

    const env = useAppSelector(selectCurrentEnvironment);
    const environments = useAppSelector(selectEnvironments);
    const mainObject = useAppSelector(selectMainObject);

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

    const picker = useAppSelector(selectPicker);
    const myLocationPoint = useAppSelector(selectCurrentLocation);
    const hoverSettings = useHoverSettings();
    const pickSettings = usePickSettings();

    const dispatch = useAppDispatch();

    const rendering = useRef({
        start: () => Promise.resolve(),
        stop: () => {},
        update: () => {},
    } as ReturnType<typeof createRendering>);
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const previousId = useRef("");
    const camera2pointDistance = useRef(0);
    const flightController = useRef<CameraController>();
    const pointerDown = useRef(false);
    const isTouchPointer = useRef(false);
    const movingClippingBox = useRef(false);
    const camX = useRef(vec3.create());
    const camY = useRef(vec3.create());

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
        if (!view || !svg || !measureScene || !size) {
            return;
        }

        const pathPoints = (params: Omit<Parameters<typeof getPathPoints>[0], "view">) =>
            getPathPoints({ view, ...params });

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
    }, [view, svg, myLocationPoint, size, measureScene]);

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
            return vec2.fromValues(((_p[0] * 0.5) / _p[3] + 0.5) * width, (0.5 - (_p[1] * 0.5) / _p[3]) * height);
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

                const { url, db, objectGroups = [], customProperties, title, ...sceneData } = sceneResponse;

                const urlData = getDataFromUrlHash();
                const camera = { kind: "flight", ...sceneData.camera, ...urlData.camera } as CameraControllerParams;
                const {
                    display: _display,
                    quality: _quality,
                    ...settings
                } = { ...sceneData.settings, ...urlData.settings };

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

                dispatchSelectionBasket(selectionBasketActions.set([]));
                initHidden(objectGroups, dispatchHidden);
                initCustomGroups(objectGroups, dispatchObjectGroups);
                initHighlighted(objectGroups, dispatchHighlighted);
                initAdvancedSettings(_view, customProperties, api);
                initProjectSettings({ sceneData: sceneResponse });

                if (urlData.mainObject !== undefined) {
                    dispatchHighlighted(highlightActions.add([urlData.mainObject]));
                    dispatch(renderActions.setMainObject(urlData.mainObject));
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
                        canvas.width = entry.contentRect.width;
                        canvas.height = entry.contentRect.height;
                        _view.applySettings({
                            display: { width: canvas.width, height: canvas.height },
                        });
                        dispatchGlobals(
                            explorerGlobalsActions.update({ size: { width: canvas.width, height: canvas.height } })
                        );
                    }
                });

                resizeObserver.observe(canvas);

                dispatch(renderActions.setDefaultDeviceProfile({ ...((api as any).deviceProfile ?? {}) }));
                if (customProperties?.triangleLimit && !(api.deviceProfile as any).debugProfile) {
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
        dispatchObjectGroups,
        dispatchHidden,
        dispatchHighlighted,
        dispatchSelectionBasket,
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
                            ids: selectionBasket.idArr,
                            hidden: false,
                            selected: true,
                            ...(selectionBasketColor.use ? { color: selectionBasketColor.color } : { neutral: true }),
                        },
                        ...objectGroups,
                        {
                            id: "",
                            ids: highlightedObjects.idArr,
                            color: highlightedObjects.color,
                            hidden: false,
                            selected: true,
                        },
                    ],
                    selectionBasket: { ...selectionBasket, mode: selectionBasketMode },
                });
            }
        },
        [
            id,
            scene,
            view,
            defaultVisibility,
            mainObject,
            objectGroups,
            highlightedObjects,
            hiddenObjects,
            selectionBasket,
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

            view.applySettings({ clippingPlanes: { ...clippingBox } });
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

                    if (cameraState.goTo.fieldOfView) {
                        (orthoController.params as OrthoControllerParams).fieldOfView = cameraState.goTo.fieldOfView;
                    }
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
                            origo: cameraState.gridOrigo ?? pt,
                            axisY: vec3.scale(vec3.create(), up, squareSize),
                            axisX: vec3.scale(vec3.create(), right, squareSize),
                        })
                    );
                }

                if (view.camera.controller.params.kind === "ortho") {
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
        if (!view?.lastRenderOutput || clippingBox.defining || !canvas) {
            return;
        }

        const result = await view.lastRenderOutput.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        if (deviation.mode !== "off" && cameraState.type === CameraType.Orthographic) {
            const pickSize = isTouchPointer.current ? 16 : 0;
            const deviation = await pickDeviationArea({
                view,
                size: pickSize,
                clickX: e.nativeEvent.offsetX,
                clickY: e.nativeEvent.offsetY,
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

        const normal = result.normal.some((n) => Number.isNaN(n)) ? undefined : vec3.clone(result.normal);
        const position = vec3.clone(result.position);

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
                (orthoController as any).init(position, normal, view.camera);
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        params: orthoController.params as OrthoControllerParams,
                    })
                );
                dispatch(renderActions.setPicker(Picker.Object));

                break;
            case Picker.Measurement:
                if (measure.forcePoint) {
                    dispatch(measureActions.selectEntity({ ObjectId: -1, drawKind: "vertex", parameter: position }));
                }

                if (measure.hover) {
                    dispatch(measureActions.selectEntity(measure.hover as ExtendedMeasureEntity));
                } else {
                    dispatch(
                        measureActions.selectEntity(
                            (await measureScene?.pickMeasureEntity(
                                result.objectId,
                                position,
                                pickSettings
                            )) as ExtendedMeasureEntity
                        )
                    );
                }
                break;
            case Picker.Manhole:
                if (result.objectId === -1) {
                    return;
                }
                dispatch(manholeActions.selectObj({ id: result.objectId, pos: position }));
                break;

            case Picker.FollowPathObject: {
                if (result.objectId === -1) {
                    return;
                }

                dispatch(followPathActions.setSelectedPositions([{ id: result.objectId, pos: position }]));
                break;
            }
            case Picker.Area: {
                dispatch(areaActions.addPoint([position, normal ?? [0, 0, 0]]));
                break;
            }
            case Picker.PointLine: {
                dispatch(pointLineActions.addPoint(position));
                break;
            }
            case Picker.HeightProfileEntity: {
                if (result.objectId === -1) {
                    return;
                }

                dispatch(heightProfileActions.selectPoint({ id: result.objectId, pos: vec3.clone(position) }));
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

        const result = await view.lastRenderOutput?.pick(x, y);

        if (!result || !pointerDown.current) {
            return;
        }

        const { position: point } = result;
        const { position, rotation, fieldOfView } = view.camera;
        const dist = vec3.dist(point, position);
        camera2pointDistance.current = dist;

        //  picked plane with no objects behind
        if (camera2pointDistance.current > 5000) {
            camera2pointDistance.current = 100;
        }

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

            dispatch(renderActions.setClippingBox({ bounds, baseBounds: bounds }));
        } else if (result.objectId > 0xfffffffe || result.objectId < 0xfffffff9) {
            camera2pointDistance.current = 0;
        } else if (clippingBox.enabled && clippingBox.showBox) {
            view.camera.controller.enabled = false;

            const highlight = 0xfffffffe - result.objectId;
            dispatch(renderActions.setClippingBox({ highlight }));
        }
    };

    const handlePointerDown = (e: PointerEvent) => {
        if (e.pointerType === "mouse") {
            isTouchPointer.current = false;
            return;
        }

        isTouchPointer.current = true;
        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) {
            return;
        }

        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handleUp = () => {
        if (!view) {
            return;
        }

        if (camera2pointDistance.current > 0 && clippingBox.defining) {
            const bounds = {
                min: vec3.clone(view.settings.clippingPlanes.bounds.min),
                max: vec3.clone(view.settings.clippingPlanes.bounds.max),
            };
            dispatch(renderActions.setClippingBox({ defining: false, bounds, baseBounds: bounds }));
        } else if (movingClippingBox.current) {
            const bounds = {
                min: vec3.clone(view.settings.clippingPlanes.bounds.min),
                max: vec3.clone(view.settings.clippingPlanes.bounds.max),
            };

            dispatch(renderActions.setClippingBox({ bounds, baseBounds: bounds }));
        }

        movingClippingBox.current = false;
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
            const measurement = await view.lastRenderOutput?.measure(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

            let hoverEnt: MeasureEntity | undefined = undefined;
            if (measureScene && measurement && picker === Picker.Measurement && !measure.forcePoint) {
                hoverEnt = await measureScene.pickMeasureEntityOnCurrentObject(
                    measurement.objectId,
                    measurement.position,
                    hoverSettings
                );
                dispatch(measureActions.selectHoverObj(hoverEnt));
            }
            canvas.style.cursor = "none";
            if (!hoverEnt || hoverEnt.drawKind === "face") {
                moveSvgCursor({ svg, view, size, measurement, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
            } else {
                moveSvgCursor({ svg, view, size, measurement: undefined, x: -100, y: -100 });
            }
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
            const measurement = await view.lastRenderOutput?.measure(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

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
            movingClippingBox.current = true;
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
                    <Engine2D />
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

function isSceneError(status: Status): status is Exclude<Status, Status.Initial> {
    return [Status.AuthError, Status.NoSceneError, Status.ServerError].includes(status);
}
