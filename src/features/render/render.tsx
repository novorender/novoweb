import { glMatrix, quat, vec3 } from "gl-matrix";
import { useEffect, useState, useRef, MouseEvent, PointerEvent } from "react";
import {
    View,
    API,
    FlightControllerParams,
    RenderSettings,
    EnvironmentDescription,
    Internal,
} from "@novorender/webgl-api";
import type { API as DataAPI } from "@novorender/data-js-api";
import { Box, Button, makeStyles, Paper, Typography, useTheme } from "@material-ui/core";

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
    selectRenderType,
    selectSavedCameraPositions,
    selectSelectMultiple,
    selectViewOnlySelected,
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

const useStyles = makeStyles({
    canvas: {
        outline: 0,
        touchAction: "none",
        height: "100vh",
        width: "100vw",
    },
});

enum Status {
    Initial,
    Error,
}

type Props = {
    id: string;
    api: API;
    dataApi: DataAPI;
    onInit?: (params: { view: View; customProperties: unknown; title: string }) => void;
};

export function Render3D({ id, api, onInit, dataApi }: Props) {
    const classes = useStyles();

    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const hiddenObjects = useHidden();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();

    const env = useAppSelector(selectCurrentEnvironment);
    const environments = useAppSelector(selectEnvironments);
    const mainObject = useAppSelector(selectMainObject);

    const viewOnlySelected = useAppSelector(selectViewOnlySelected);
    const cameraSpeedMultiplier = useAppSelector(selectCameraSpeedMultiplier);
    const baseCameraSpeed = useAppSelector(selectBaseCameraSpeed);
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const selectMultiple = useAppSelector(selectSelectMultiple);
    const renderType = useAppSelector(selectRenderType);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();

    const rendering = useRef({ start: () => Promise.resolve(), stop: () => {} });
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const cameraMoveRef = useRef<ReturnType<typeof requestAnimationFrame>>();
    const previousId = useRef("");
    const camera2pointDistance = useRef(0);
    const pointerDown = useRef(false);
    const camX = useRef(vec3.create());
    const camY = useRef(vec3.create());

    const [canvas, setCanvas] = useState<null | HTMLCanvasElement>(null);
    const [status, setStatus] = useMountedState(Status.Initial);
    const [view, setView] = useMountedState<View | undefined>(undefined);
    const scene = view?.scene;

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
                const { url, db, camera, objectGroups, bookmarks, customProperties, title, ...sceneData } =
                    await dataApi.loadScene(id);

                const settings = sceneData.settings ?? ({} as Partial<RenderSettings>);
                const { display: _display, ...customSettings } = settings ?? {};
                const _view = await api.createView(customSettings, canvas);
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

                const initialEnvironment =
                    typeof settings.environment === "string"
                        ? getEnvironmentDescription(settings.environment, environments)
                        : (settings.environment as unknown as EnvironmentDescription) ??
                          getEnvironmentDescription("", environments);

                dispatch(renderActions.setEnvironment(initialEnvironment));
                dispatch(renderActions.setBookmarks(bookmarks));

                const defaultGroup = objectGroups.find((group) => !group.id && group.selected);
                if (defaultGroup) {
                    dispatchHighlighted(
                        highlightActions.set({
                            ids: defaultGroup.ids as number[],
                            color: [defaultGroup.color[0], defaultGroup.color[1], defaultGroup.color[2]],
                        })
                    );
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
                rendering.current = createRendering(canvas, _view, api);
                rendering.current.start();
                window.document.title = `${title} - Novorender`;
                window.addEventListener("blur", exitPointerLock);
                canvas.focus();

                if (onInit) {
                    onInit({ view: _view, customProperties, title });
                }
            } catch {
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

            if (cameraMoveRef.current) {
                cancelAnimationFrame(cameraMoveRef.current);
            }

            cameraMoved(view);

            function cameraMoved(view: View) {
                if ((window as any).Cypress) {
                    (window as any).appFullyRendered =
                        view.performanceStatistics.sceneResolved && view.performanceStatistics.renderResolved;
                }

                if (cameraGeneration.current !== view.performanceStatistics.cameraGeneration) {
                    cameraGeneration.current = view.performanceStatistics.cameraGeneration ?? 0;

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

                cameraMoveRef.current = requestAnimationFrame(() => cameraMoved(view));
            }
        },
        [view, dispatch, savedCameraPositions]
    );

    useEffect(
        function handleObjectHighlightChanges() {
            if (scene && view) {
                refillObjects({
                    scene,
                    view,
                    api,
                    objectGroups: [
                        { ...hiddenObjects, hidden: true, selected: false, color: [0, 0, 0] },
                        ...customGroups,
                        { ...highlightedObjects, hidden: false, selected: true },
                    ],
                    viewOnlySelected,
                });
            }
        },
        [scene, view, api, viewOnlySelected, mainObject, customGroups, highlightedObjects, hiddenObjects]
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
        window.document.exitPointerLock();
    };

    const handleClick = async (e: React.MouseEvent) => {
        if (!view) {
            return;
        }

        const result = await view.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        if (!result || result.objectId > 0x1000000) {
            return;
        }

        const alreadySelected = result.objectId === mainObject || highlightedObjects.ids.includes(result.objectId);

        if (selectMultiple) {
            if (alreadySelected) {
                dispatch(renderActions.setMainObject(undefined));
                dispatchHighlighted(highlightActions.remove([result.objectId]));
            } else {
                dispatch(renderActions.setMainObject(result.objectId));
                dispatchHighlighted(highlightActions.add([result.objectId]));
            }
        } else {
            if (alreadySelected) {
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

    const handleMove = (e: MouseEvent | PointerEvent) => {
        if (
            !view ||
            !canvas ||
            !clippingPlanes.enabled ||
            !clippingPlanes.showBox ||
            !pointerDown.current ||
            camera2pointDistance.current === 0 ||
            (!e.movementY && !e.movementX)
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

    return (
        <Box position="relative" width="100%" height="100%">
            {status === Status.Error ? (
                <NoScene id={id} />
            ) : (
                <>
                    {showPerformance && view && canvas ? <PerformanceStats view={view} canvas={canvas} /> : null}
                    <canvas
                        className={classes.canvas}
                        tabIndex={1}
                        ref={setCanvas}
                        onClick={handleClick}
                        onMouseDown={handleMouseDown}
                        onPointerEnter={handlePointerDown}
                        onPointerMove={handleMove}
                        onPointerUp={handleUp}
                    />
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
