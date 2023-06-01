import { glMatrix, mat3, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";
import {
    useEffect,
    useState,
    useRef,
    MouseEvent,
    PointerEvent,
    useCallback,
    RefCallback,
    TouchEvent,
    WheelEvent,
} from "react";
import {
    View,
    EnvironmentDescription,
    Internal,
    CameraController,
    OrthoControllerParams,
    CameraControllerParams,
    FlightControllerParams,
} from "@novorender/webgl-api";
import { MeasureScene } from "@novorender/measure-api";
import { Box, styled, css } from "@mui/material";

import { PerformanceStats } from "features/performanceStats";
import { getDataFromUrlHash } from "features/shareLink";
import { imagesActions, useHandleImageChanges } from "features/images";
import { LinearProgress, Loading } from "components";
import { api, dataApi, isIpad, isIphone, measureApi } from "app";
import { useSceneId } from "hooks/useSceneId";
import {
    fetchEnvironments,
    renderActions,
    selectClippingBox,
    selectCurrentEnvironment,
    selectEnvironments,
    selectMainObject,
    selectSavedCameraPositions,
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
    selectLoadingHandles,
    selectViewMode,
    selectStamp,
    StampKind,
    selectCurrentCameraSpeedLevel,
    selectCameraSpeedLevels,
    selectProportionalCameraSpeed,
    selectPointerLock,
} from "features/render/renderSlice";
import { explorerActions, selectLocalBookmarkId, selectUrlBookmarkId } from "slices/explorerSlice";
import { selectDeviations } from "features/deviations";
import { useSelectBookmark } from "features/bookmarks/useSelectBookmark";
import { measureActions, useMeasureHoverSettings } from "features/measure";
import { useHandleManholeUpdates } from "features/manhole";
import { useHandleDitioKeepAlive } from "features/ditio";
import { useAppDispatch, useAppSelector } from "app/store";
import { useHandleAreaPoints } from "features/area";
import { useHandlePointLineUpdates } from "features/pointLine";
import { useHandleLocationMarker } from "features/myLocation";
import { useHandleJiraKeepAlive } from "features/jira";
import { Engine2D } from "features/engine2D";
import { useHandleXsiteManageKeepAlive, useHandleXsiteManageMachineLocations } from "features/xsiteManage";
import { ViewMode } from "types/misc";
import {
    orthoCamActions,
    selectCrossSectionPoint,
    selectCurrentTopDownElevation,
    useHandleCrossSection,
} from "features/orthoCam";
import { useHandleClippingBoxChanges } from "features/clippingBox";

import { useHighlighted, highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useHidden, useDispatchHidden } from "contexts/hidden";
import { useObjectGroups, useDispatchObjectGroups } from "contexts/objectGroups";
import { useDispatchSelectionBasket, useSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
    useHighlightCollections,
} from "contexts/highlightCollections";

import {
    refillObjects,
    createRendering,
    initHighlighted,
    initHidden,
    initObjectGroups,
    initEnvironment,
    initCamera,
    initClippingBox,
    initClippingPlanes,
    initAdvancedSettings,
    initDeviations,
    initSubtrees,
    initProjectSettings,
    initCameraSpeedLevels,
    initProportionalCameraSpeed,
    initPointerLock,
    initDefaultTopDownElevation,
    initPropertiesSettings,
} from "./utils";
import { xAxis, yAxis, axis } from "./consts";
import { moveSvgCursor } from "./svgUtils";
import { useHandleGridChanges } from "./hooks/useHandleGridChanges";
import { useHandleCameraControls } from "./hooks/useHandleCameraControls";
import { useCanvasClickHandler } from "./hooks/useCanvasClickHandler";
import { useHandleCanvasCursor } from "./hooks/useHandleCanvasCursor";
import { Stamp } from "./stamp";
import { Markers } from "./markers";
import { isSceneError, SceneError } from "./sceneError";
import { useMoveMarkers } from "./hooks/useMoveMarkers";
import { Images } from "./images";
import { useCanvasContextMenuHandler } from "./hooks/useCanvasContextMenuHandler";

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
        overflow: hidden;
        pointer-events: none;

        g {
            will-change: transform;
        }
    `
);

export enum Status {
    Initial,
    NoSceneError,
    AuthError,
    ServerError,
}

type Props = {
    onInit: (params: { customProperties: unknown }) => void;
};

export function Render3D({ onInit }: Props) {
    const sceneId = useSceneId();
    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const highlightCollections = useHighlightCollections();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const hiddenObjects = useHidden();
    const dispatchHidden = useDispatchHidden();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const selectionBasket = useSelectionBasket();
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { view_OLD: view, scene_OLD: scene, canvas, measureScene, size },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();
    const selectBookmark = useSelectBookmark();

    const env = useAppSelector(selectCurrentEnvironment);
    const environments = useAppSelector(selectEnvironments);
    const mainObject = useAppSelector(selectMainObject);

    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const cameraSpeedLevels = useAppSelector(selectCameraSpeedLevels).flight;
    const currentCameraSpeedLevel = useAppSelector(selectCurrentCameraSpeedLevel);
    const proportionalCameraSpeed = useAppSelector(selectProportionalCameraSpeed);
    const pointerLock = useAppSelector(selectPointerLock);
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const subtrees = useAppSelector(selectSubtrees);
    const selectionBasketMode = useAppSelector(selectSelectionBasketMode);
    const selectionBasketColor = useAppSelector(selectSelectionBasketColor);
    const clippingBox = useAppSelector(selectClippingBox);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const cameraState = useAppSelector(selectCamera);
    const advancedSettings = useAppSelector(selectAdvancedSettings);
    const deviation = useAppSelector(selectDeviations);
    const gridDefaults = useAppSelector(selectGridDefaults);
    const urlBookmarkId = useAppSelector(selectUrlBookmarkId);
    const localBookmarkId = useAppSelector(selectLocalBookmarkId);
    const loadingHandles = useAppSelector(selectLoadingHandles);
    const stamp = useAppSelector(selectStamp);
    const picker = useAppSelector(selectPicker);
    const crossSectionPoint = useAppSelector(selectCrossSectionPoint);
    const viewMode = useAppSelector(selectViewMode);
    const currentTopDownElevation = useAppSelector(selectCurrentTopDownElevation);

    const handleCanvasClick = useCanvasClickHandler();
    const handleCanvasContextMenu = useCanvasContextMenuHandler();
    const usingSvgCursor = useHandleCanvasCursor();
    const measureHoverSettings = useMeasureHoverSettings();

    const dispatch = useAppDispatch();

    const rendering = useRef({
        start: () => Promise.resolve(),
        stop: () => {},
        update: () => {},
    } as ReturnType<typeof createRendering>);
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const orthoMovementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const previousSceneId = useRef("");
    const camera2pointDistance = useRef(0);
    const flightController = useRef<CameraController>();
    const pointerDown = useRef(false);
    const isTouchPointer = useRef(false);
    const movingClippingBox = useRef(false);
    const pointerPos = useRef([0, 0] as [x: number, y: number]);
    const camX = useRef(vec3.create());
    const camY = useRef(vec3.create());

    const [svg, setSvg] = useState<null | SVGSVGElement>(null);
    const [status, setStatus] = useState<{ status: Status; msg?: string }>({ status: Status.Initial });

    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    const moveSvgMarkers = useMoveMarkers(svg);

    useEffect(() => {
        if (!environments.length) {
            dispatch(fetchEnvironments(api));
        }
    }, [dispatch, environments]);

    useEffect(() => {
        initView();

        async function initView() {
            if (previousSceneId.current === sceneId || !canvas || !environments.length) {
                return;
            }

            previousSceneId.current = sceneId;

            try {
                const sceneResponse = await dataApi.loadScene(sceneId);

                if ("error" in sceneResponse) {
                    throw sceneResponse;
                }

                const { url, db, objectGroups = [], customProperties = {}, title, ...sceneData } = sceneResponse;

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
                initDeviations(_view.settings.points.deviation);

                dispatchSelectionBasket(selectionBasketActions.set([]));
                initHidden(dispatchHidden);
                initObjectGroups(objectGroups, dispatchObjectGroups);
                initHighlighted(dispatchHighlighted, customProperties.highlights?.primary?.color);
                if (customProperties.highlights?.secondary?.color) {
                    dispatchHighlightCollections(
                        highlightCollectionsActions.setColor(
                            HighlightCollection.SecondaryHighlight,
                            customProperties.highlights?.secondary?.color
                        )
                    );
                }
                initAdvancedSettings(_view, customProperties, api);
                initProjectSettings({ sceneData: sceneResponse });
                initCameraSpeedLevels(customProperties, camera);
                initProportionalCameraSpeed(customProperties);
                initPointerLock(customProperties);
                initDefaultTopDownElevation(customProperties);
                initPropertiesSettings(customProperties);

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
                        view_OLD: _view,
                        scene_OLD: _view.scene,
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
        sceneId,
        dispatchGlobals,
        setStatus,
        dispatchObjectGroups,
        dispatchHidden,
        dispatchHighlighted,
        dispatchSelectionBasket,
        dispatchHighlightCollections,
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

                    moveSvgMarkers();
                    dispatch(renderActions.setStamp(null));

                    if (movementTimer.current) {
                        clearTimeout(movementTimer.current);
                    }

                    if (orthoMovementTimer.current) {
                        clearTimeout(orthoMovementTimer.current);
                    }

                    orthoMovementTimer.current = setTimeout(() => {
                        if (
                            !view ||
                            cameraState.type !== CameraType.Orthographic ||
                            view.camera.controller.params.kind !== "ortho"
                        ) {
                            return;
                        }

                        // Update elevation
                        const mat = mat3.fromQuat(mat3.create(), view.camera.rotation);
                        const up = [0, 1, 0] as vec3;
                        const topDown = vec3.equals(vec3.fromValues(mat[6], mat[7], mat[8]), up);
                        const elevation = topDown ? view.camera.controller.params.referenceCoordSys[13] : undefined;
                        if (currentTopDownElevation !== elevation) {
                            dispatch(orthoCamActions.setCurrentTopDownElevation(elevation));
                        }

                        // Move grid
                        const origo = vec3.clone(view.settings.grid.origo);
                        const z = vec3.fromValues(mat[6], mat[7], mat[8]);
                        const camPos = vec3.fromValues(
                            view.camera.controller.params.referenceCoordSys[12],
                            view.camera.controller.params.referenceCoordSys[13],
                            view.camera.controller.params.referenceCoordSys[14]
                        );
                        const delta = vec3.dot(z, vec3.sub(vec3.create(), camPos, origo));
                        const newPos = vec3.scaleAndAdd(vec3.create(), origo, z, delta);
                        dispatch(renderActions.setGrid({ origo: newPos }));
                    }, 100);

                    movementTimer.current = setTimeout(() => {
                        if (!view || cameraState.type === CameraType.Orthographic || viewMode === ViewMode.Panorama) {
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
            dispatch,
            currentTopDownElevation,
            savedCameraPositions,
            cameraState,
            advancedSettings,
            viewMode,
            moveSvgMarkers,
        ]
    );

    useEffect(
        function handleObjectHighlightChanges() {
            if (scene && view) {
                refillObjects({
                    scene,
                    view,
                    defaultVisibility,
                    sceneId: sceneId,
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
                            ids: highlightCollections.secondaryHighlight.idArr,
                            color: highlightCollections.secondaryHighlight.color,
                            hidden: false,
                            selected: true,
                        },
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
            sceneId,
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
            highlightCollections,
        ]
    );

    useEffect(
        function handleSubtreeChanges() {
            if (!view || !("advanced" in view.settings) || !subtrees) {
                return;
            }

            const settings = view.settings as Internal.RenderSettingsExt;

            if (viewMode === ViewMode.Panorama) {
                settings.advanced.hideLines = true;
                settings.advanced.hidePoints = true;
                settings.advanced.hideTerrain = true;
                settings.advanced.hideTriangles = true;
                settings.advanced.hideDocuments = true;
                return;
            }

            settings.advanced.hideLines = subtrees.lines !== SubtreeStatus.Shown;
            settings.advanced.hidePoints = subtrees.points !== SubtreeStatus.Shown;
            settings.advanced.hideTerrain = subtrees.terrain !== SubtreeStatus.Shown;
            settings.advanced.hideTriangles = subtrees.triangles !== SubtreeStatus.Shown;
            settings.advanced.hideDocuments = subtrees.documents !== SubtreeStatus.Shown;
        },
        [subtrees, view, viewMode]
    );

    useEffect(
        function handleCameraSpeedChanges() {
            if (!view) {
                return;
            }

            const params = flightController.current?.params as FlightControllerParams;
            params.linearVelocity = cameraSpeedLevels[currentCameraSpeedLevel];
            params.proportionalCameraSpeed = proportionalCameraSpeed.enabled
                ? {
                      min: proportionalCameraSpeed.min,
                      max: proportionalCameraSpeed.max,
                      pickDelay: proportionalCameraSpeed.pickDelay,
                  }
                : undefined;
        },
        [cameraSpeedLevels, currentCameraSpeedLevel, proportionalCameraSpeed, view, canvas]
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
        function handleClippingPlaneChanges() {
            if (!view) {
                return;
            }

            view.applySettings({
                clippingVolume: {
                    planes: clippingPlanes.planes.map((plane) => plane.plane),
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

                if (cameraState.goTo) {
                    controller.moveTo(cameraState.goTo.position, cameraState.goTo.rotation);
                } else if (cameraState.zoomTo) {
                    controller.zoomTo(cameraState.zoomTo);
                } else if (view.camera.controller.params.kind === "ortho") {
                    const pos: vec3 | undefined = (view.camera.controller as any).outputPosition;
                    const rot: quat | undefined = (view.camera.controller as any).outputRotation;

                    if (pos && rot) {
                        const params = controller.params as FlightControllerParams;
                        const tmp = params.flightTime;
                        params.flightTime = 0;
                        controller.moveTo(vec3.clone(pos), quat.clone(rot));
                        params.flightTime = tmp;
                    }
                }

                view.camera.controller = controller;
                (view.camera.controller.params as FlightControllerParams).fieldOfView = 60;
                view.camera.fieldOfView = 60;
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
                    (orthoController.params as OrthoControllerParams).pointerLockOnPan =
                        view.camera.controller.params.pointerLockOnPan;
                }

                dispatch(imagesActions.setActiveImage(undefined));
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
        function handlePointerLockChanges() {
            if (cameraState.type === CameraType.Orthographic && view?.camera.controller.params.kind === "ortho") {
                view.camera.controller.params.pointerLockOnPan = pointerLock.ortho;
            }
        },
        [cameraState, pointerLock, view, canvas]
    );

    useHandleGridChanges();
    useHandleClippingBoxChanges();
    useHandleImageChanges();
    useHandleCameraControls();
    useHandleAreaPoints();
    useHandleCrossSection();
    useHandleLocationMarker();
    useHandleManholeUpdates();
    useHandlePointLineUpdates();
    useHandleJiraKeepAlive();
    useHandleXsiteManageKeepAlive();
    useHandleXsiteManageMachineLocations();
    useHandleDitioKeepAlive();

    useEffect(() => {
        view?.applySettings({ background: { color: advancedSettings.backgroundColor } });
    }, [view, advancedSettings.backgroundColor]);

    useEffect(() => {
        handleUrlBookmark();

        async function handleUrlBookmark() {
            if (!view || !urlBookmarkId) {
                return;
            }

            dispatch(explorerActions.setUrlBookmarkId(undefined));

            try {
                const shareLinkBookmark = (await dataApi.getBookmarks(sceneId, { group: urlBookmarkId })).find(
                    (bm) => bm.id === urlBookmarkId
                );

                if (shareLinkBookmark) {
                    selectBookmark(shareLinkBookmark);
                    return;
                }

                const savedPublicBookmark = (await dataApi.getBookmarks(sceneId)).find((bm) => bm.id === urlBookmarkId);
                if (savedPublicBookmark) {
                    selectBookmark(savedPublicBookmark);
                    return;
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, sceneId, dispatch, selectBookmark, urlBookmarkId]);

    useEffect(() => {
        handleLocalBookmark();

        function handleLocalBookmark() {
            if (!view || !localBookmarkId) {
                return;
            }

            dispatch(explorerActions.setLocalBookmarkId(undefined));

            try {
                const storedBm = sessionStorage.getItem(localBookmarkId);

                if (!storedBm) {
                    return;
                }

                sessionStorage.removeItem(localBookmarkId);
                const bookmark = JSON.parse(storedBm);

                if (!bookmark) {
                    return;
                }
                selectBookmark(bookmark);
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, sceneId, dispatch, selectBookmark, localBookmarkId]);

    const exitPointerLock = () => {
        if ("exitPointerLock" in window.document) {
            window.document.exitPointerLock();
        }
    };

    const handleDown = async (x: number, y: number, timestamp: number) => {
        dispatch(
            renderActions.setPointerDownState({
                timestamp,
                x,
                y,
            })
        );

        if (!view || picker !== Picker.ClippingBox) {
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
        } else {
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
        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.timeStamp);
    };

    // Need this until contextmenu event is supported in mobile safari.
    // 'oncontextmenu' in window == true, but doesn't fire.
    const contextMenuTouchState = useRef<{
        startPos: Vec2;
        currentPos: Vec2;
        timer: ReturnType<typeof setTimeout>;
    }>();
    const handleTouchDown = (e: TouchEvent<HTMLCanvasElement>) => {
        if (contextMenuTouchState.current) {
            clearTimeout(contextMenuTouchState.current.timer);
            contextMenuTouchState.current = undefined;
        }

        if ((isIphone || isIpad) && e.touches.length === 1) {
            dispatch(renderActions.setStamp(null));
            const pos = [e.touches[0].clientX, e.touches[0].clientY] as Vec2;
            contextMenuTouchState.current = {
                startPos: pos,
                currentPos: [...pos],
                timer: setTimeout(() => {
                    if (
                        contextMenuTouchState.current &&
                        vec2.dist(contextMenuTouchState.current.startPos, contextMenuTouchState.current.currentPos) <=
                            10
                    ) {
                        handleCanvasContextMenu(contextMenuTouchState.current.currentPos);
                        contextMenuTouchState.current = undefined;
                    }
                }, 500),
            };
        }
    };

    const prevPinchDiff = useRef<number>(0);
    const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
        if (contextMenuTouchState.current && e.touches.length === 1) {
            contextMenuTouchState.current.currentPos[0] = e.touches[0].clientX;
            contextMenuTouchState.current.currentPos[1] = e.touches[0].clientY;
        }

        if (e.touches.length === 4 && clippingPlanes.enabled) {
            const touches = Array.from(e.touches).sort((a, b) => a.clientY - b.clientY);
            const top = (touches[0].clientY + touches[1].clientY, touches[2].clientY) / 3;
            const bot = touches[3].clientY;
            const diff = top - bot;

            if (Math.abs(prevPinchDiff.current - diff) >= 1) {
                moveClippingPlanes(-(Math.sign(prevPinchDiff.current - diff) * 0.1));
            }

            prevPinchDiff.current = diff;
        }
    };

    const handleTouchUp = () => {
        if (contextMenuTouchState.current) {
            clearTimeout(contextMenuTouchState.current.timer);
            contextMenuTouchState.current = undefined;
        }
    };

    const contextMenuCursorState = useRef<{
        timestamp: number;
        startPos: Vec2;
        currentPos: Vec2;
    }>();
    const handleMouseDown = (e: MouseEvent) => {
        contextMenuCursorState.current = undefined;
        if (e.button === 2) {
            contextMenuCursorState.current = {
                timestamp: e.timeStamp,
                startPos: [e.clientX, e.clientY],
                currentPos: [e.clientX, e.clientY],
            };
            return;
        } else if (e.button !== 0) {
            return;
        }

        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.timeStamp);
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerType === "mouse") {
            return;
        }

        handleUp();
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (e.buttons === 0 && e.button === 2) {
            const cursorState = contextMenuCursorState.current;

            if (!cursorState) {
                return;
            }

            const longPress = e.timeStamp - cursorState.timestamp >= 300;
            const drag = vec2.dist(cursorState.startPos, cursorState.currentPos) >= 5;

            contextMenuCursorState.current = undefined;
            if (longPress || drag) {
                return;
            }

            handleCanvasContextMenu(cursorState.currentPos);
        } else if (e.button !== 0) {
            return;
        }

        handleUp();
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

    const prevHoverUpdate = useRef(0);
    const prevHoverEnt = useRef<Awaited<ReturnType<MeasureScene["pickMeasureEntityOnCurrentObject"]>>>();
    const previous2dSnapPos = useRef(vec2.create());
    const handleMove = async (e: PointerEvent) => {
        pointerPos.current = [e.nativeEvent.offsetX, e.nativeEvent.offsetY];
        if (!view || !canvas || !svg || (!e.movementY && !e.movementX)) {
            return;
        }

        if (e.buttons === 0 && usingSvgCursor) {
            const measurement = await view.lastRenderOutput?.measure(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

            let hoverEnt = prevHoverEnt.current;
            const now = performance.now();
            const shouldPickHoverEnt = now - prevHoverUpdate.current > 75;

            if (shouldPickHoverEnt) {
                prevHoverUpdate.current = now;

                if (picker === Picker.Measurement) {
                    if (measureScene && measurement) {
                        const dist =
                            hoverEnt?.connectionPoint && vec3.dist(measurement.position, hoverEnt.connectionPoint);

                        if (!dist || dist > 0.2) {
                            hoverEnt = await measureScene.pickMeasureEntityOnCurrentObject(
                                measurement.objectId,
                                measurement.position,
                                measureHoverSettings
                            );
                        }
                        vec2.copy(
                            previous2dSnapPos.current,
                            vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                        );
                    } else if (!measurement) {
                        const currentPos = vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                        if (vec2.dist(currentPos, previous2dSnapPos.current) > 25) {
                            hoverEnt = undefined;
                        }
                    }
                    dispatch(measureActions.selectHoverObj(hoverEnt?.entity));
                    prevHoverEnt.current = hoverEnt;
                } else if (picker === Picker.CrossSection) {
                    if (crossSectionPoint && measurement) {
                        dispatch(orthoCamActions.setCrossSectionHover(measurement.position as vec3));
                    }
                }
            }

            const color =
                !hoverEnt?.entity && !measurement?.objectId
                    ? "red"
                    : hoverEnt?.status === "loaded"
                    ? "lightgreen"
                    : hoverEnt?.entity === undefined || hoverEnt.status === "unknown"
                    ? "blue"
                    : "yellow";

            if (!hoverEnt?.entity || hoverEnt.entity.drawKind === "face") {
                moveSvgCursor({
                    svg,
                    view,
                    size,
                    measurement,
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    color,
                });
            } else {
                moveSvgCursor({
                    svg,
                    view,
                    size,
                    measurement: undefined,
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    color: color,
                });
            }
            return;
        } else {
            moveSvgCursor({ svg, view, size, measurement: undefined, x: -100, y: -100, color: "" });
        }

        if (
            !stamp?.pinned &&
            deviation.mode !== "off" &&
            cameraState.type === CameraType.Orthographic &&
            e.buttons === 0 &&
            subtrees?.points === SubtreeStatus.Shown
        ) {
            const measurement = await view.lastRenderOutput?.measure(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

            if (measurement?.deviation) {
                dispatch(
                    renderActions.setStamp({
                        kind: StampKind.Deviation,
                        pinned: false,
                        mouseX: e.nativeEvent.offsetX,
                        mouseY: e.nativeEvent.offsetY,
                        data: { deviation: measurement.deviation },
                    })
                );
            } else {
                dispatch(renderActions.setStamp(null));
            }
        } else if (stamp && !stamp.pinned) {
            dispatch(renderActions.setStamp(null));
        }

        if (contextMenuCursorState.current) {
            contextMenuCursorState.current.currentPos[0] += e.movementX;
            contextMenuCursorState.current.currentPos[1] += e.movementY;
        }

        if (!pointerDown.current || picker !== Picker.ClippingBox || camera2pointDistance.current === 0) {
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

    const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
        if (!e.shiftKey || !clippingPlanes.enabled) {
            return;
        }

        moveClippingPlanes(-(e.deltaY / 100));
    };

    const clippingPlaneCommitTimer = useRef<ReturnType<typeof setTimeout>>();
    const moveClippingPlanes = (delta: number) => {
        if (!view) {
            return;
        }

        if (clippingPlaneCommitTimer.current) {
            clearTimeout(clippingPlaneCommitTimer.current);
        }
        view.applySettings({
            clippingVolume: {
                planes: view.settings.clippingVolume.planes.map((plane) => [
                    plane[0],
                    plane[1],
                    plane[2],
                    plane[3] + delta,
                ]),
            },
        });

        clippingPlaneCommitTimer.current = setTimeout(() => {
            dispatch(
                renderActions.setClippingPlanes({
                    planes: view.settings.clippingVolume.planes.map((plane) => ({
                        plane: vec4.clone(plane) as Vec4,
                        baseW: plane[3],
                    })),
                })
            );
        }, 100);
    };

    return (
        <Box position="relative" width="100%" height="100%" sx={{ userSelect: "none" }}>
            {loadingHandles.length !== 0 && (
                <Box position={"absolute"} top={0} width={1} display={"flex"} justifyContent={"center"}>
                    <LinearProgress />
                </Box>
            )}
            {isSceneError(status.status) ? (
                <SceneError error={status.status} msg={status.msg} id={sceneId} />
            ) : (
                <>
                    {advancedSettings.showPerformance && view && canvas ? <PerformanceStats /> : null}
                    <Canvas
                        id="main-canvas"
                        tabIndex={1}
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        onMouseDown={handleMouseDown}
                        onContextMenu={(evt) => {
                            if (!isTouchPointer.current) {
                                return;
                            }
                            evt.preventDefault();
                            handleCanvasContextMenu([evt.clientX, evt.clientY]);
                        }}
                        onMouseUp={handleMouseUp}
                        onPointerEnter={handlePointerDown}
                        onPointerMove={handleMove}
                        onPointerUp={handlePointerUp}
                        onPointerOut={() => {
                            if (svg && view) {
                                moveSvgCursor({ svg, view, size, measurement: undefined, x: -100, y: -100, color: "" });
                            }
                        }}
                        onTouchStart={handleTouchDown}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchUp}
                        onTouchCancel={handleTouchUp}
                        onWheel={handleWheel}
                    />
                    <Engine2D pointerPos={pointerPos} />
                    {view && <Stamp />}
                    {canvas && (
                        <Svg width={canvas.width} height={canvas.height} ref={setSvg}>
                            <Markers />
                            <g id="cursor" />
                        </Svg>
                    )}
                    <Images />
                    {!view && <Loading />}
                </>
            )}
        </Box>
    );
}
