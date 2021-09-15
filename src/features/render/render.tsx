import { glMatrix, quat, vec2, vec3 } from "gl-matrix";
import { useEffect, useState, useRef, MouseEvent, PointerEvent } from "react";
import { useSelector } from "react-redux";
import {
    View,
    API,
    FlightControllerParams,
    Scene,
    RenderSettings,
    EnvironmentDescription,
    Internal,
} from "@novorender/webgl-api";
import type { API as DataAPI, ObjectGroup } from "@novorender/data-js-api";
import { Box, Button, makeStyles, Paper, Typography, useTheme } from "@material-ui/core";

import {
    fetchEnvironments,
    ObjectGroups,
    renderActions,
    RenderType,
    selectBaseCameraSpeed,
    selectCameraSpeedMultiplier,
    selectClippingPlanes,
    selectCurrentEnvironment,
    selectEnvironments,
    selectMainObject,
    selectObjectGroups,
    selectRenderType,
    selectSavedCameraPositions,
    selectSelectMultiple,
    selectViewOnlySelected,
} from "slices/renderSlice";
import { sleep } from "utils/timers";
import { useAppDispatch } from "app/store";
import { PerformanceStats } from "features/performanceStats";
import { useMountedState } from "hooks/useMountedState";
import { authActions } from "slices/authSlice";
import { deleteStoredToken } from "utils/auth";
import { offscreenCanvas } from "config";
import { Loading } from "components";

const useStyles = makeStyles({
    canvas: {
        outline: 0,
        touchAction: "none",
        height: "100vh",
        width: "100vw",
    },
});

glMatrix.setMatrixArrayType(Array);

const showPerformance = localStorage.getItem("show-performance-stats") !== null;
const taaEnabled = localStorage.getItem("disable-taa") === null;
const ssaoEnabled = localStorage.getItem("disable-ssao") === null;
const axis = [
    vec3.fromValues(1, 0, 0),
    vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 1),
    vec3.fromValues(1, 0, 0),
    vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 1),
];
const xAxis = vec3.fromValues(1, 0, 0);
const yAxis = vec3.fromValues(0, 1, 0);

addConsoleDebugUtils();

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

    const env = useSelector(selectCurrentEnvironment);
    const environments = useSelector(selectEnvironments);
    const mainObject = useSelector(selectMainObject);
    const objectGroups = useSelector(selectObjectGroups);
    const viewOnlySelected = useSelector(selectViewOnlySelected);
    const cameraSpeedMultiplier = useSelector(selectCameraSpeedMultiplier);
    const baseCameraSpeed = useSelector(selectBaseCameraSpeed);
    const savedCameraPositions = useSelector(selectSavedCameraPositions);
    const selectMultiple = useSelector(selectSelectMultiple);
    const renderType = useSelector(selectRenderType);
    const clippingPlanes = useSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();

    const running = useRef(false);
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const cameraMoveRef = useRef<ReturnType<typeof requestAnimationFrame>>();
    const previousId = useRef("");
    const camera2pointDistance = useRef(0);
    const lastPointerX = useRef(0);
    const lastPointerY = useRef(0);
    const pointerMoved = useRef(false);
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
                dispatch(
                    renderActions.setObjectGroups(
                        serializeableObjectGroups({
                            default: objectGroups.find((group) => group.name === "default"),
                            defaultHidden: objectGroups.find((group) => group.name === "defaultHidden"),
                            custom: objectGroups.filter((group) => !["default", "defaultHidden"].includes(group.name)),
                        })
                    )
                );

                setView(_view);
                run(canvas, _view, api);
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
    }, [canvas, view, api, dataApi, dispatch, onInit, environments, id, setView, setStatus]);

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
                        objectGroups.defaultHidden,
                        ...objectGroups.custom,
                        objectGroups.default,
                        {
                            name: "",
                            ids: mainObject !== undefined ? [mainObject] : [],
                            id: "",
                            color: objectGroups.default.color,
                            selected: true,
                            hidden: false,
                        },
                    ],
                    viewOnlySelected,
                });
            }
        },
        [scene, view, api, objectGroups, viewOnlySelected, mainObject]
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
                window.removeEventListener("blur", exitPointerLock);
                running.current = false;
                dispatch(renderActions.resetState());
                setStatus(Status.Initial);
            };
        },
        [id, dispatch, setStatus]
    );

    const run = async (canvas: HTMLCanvasElement, view: View, api: API) => {
        running.current = true;
        const ctx = offscreenCanvas ? canvas.getContext("2d", { alpha: true, desynchronized: false }) : undefined;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                canvas.width = entry.contentRect.width;
                canvas.height = entry.contentRect.height;
                view.applySettings({ display: { width: canvas.width, height: canvas.height } });
            }
        });

        await sleep(500);
        resizeObserver.observe(canvas);

        const fpsTable: number[] = [];
        let noBlankFrame = true;
        function blankCallback() {
            noBlankFrame = false;
        }

        while (running.current) {
            noBlankFrame = true;
            const startRender = performance.now();
            const output = await view.render(blankCallback);
            const { width, height } = canvas;
            const badPerf = view.performanceStatistics.weakDevice; // || view.settings.quality.resolution.value < 1;

            if (ssaoEnabled && !badPerf) {
                output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: true });
            }

            const image = await output.getImage();

            if (ctx && image) {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                // ctx.transferFromImageBitmap(image); // display in canvas
            }

            if (noBlankFrame) {
                const dt = performance.now() - startRender;
                fpsTable.splice(0, 0, 1000 / dt);
                if (fpsTable.length > 200) {
                    fpsTable.length = 200;
                }
                let fps = 0;
                for (let f of fpsTable) {
                    fps += f;
                }
                fps /= fpsTable.length;
                (view.performanceStatistics as any).fps = fps;
            }

            let run = taaEnabled;
            let reset = true;
            const start = performance.now();
            while (run) {
                if (output.hasViewChanged) {
                    break;
                }

                await (api as any).waitFrame();

                if (performance.now() - start < 500) {
                    continue;
                }

                run = (await output.applyPostEffect({ kind: "taa", reset })) || false;

                if (ssaoEnabled) {
                    output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: reset && badPerf });
                }

                reset = false;
                const image = await output.getImage();
                if (ctx && image) {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                    // ctx.transferFromImageBitmap(image); // display in canvas
                }
            }
            (output as any).dispose();
        }
    };

    const exitPointerLock = () => {
        window.document.exitPointerLock();
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!pointerMoved.current) {
            selectObject(vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY));
            pointerMoved.current = true;
        }
    };

    const selectObject = async (point: vec2) => {
        if (!view) {
            return;
        }

        const result = await view.pick(point[0], point[1]);
        if (!result || result.objectId > 0x1000000) {
            return;
        }

        const alreadySelected = result.objectId === mainObject || objectGroups.default.ids.includes(result.objectId);

        if (selectMultiple) {
            if (alreadySelected) {
                dispatch(renderActions.setMainObject(undefined));
                dispatch(renderActions.unSelectObjects([result.objectId]));
            } else {
                dispatch(renderActions.setMainObject(result.objectId));
                dispatch(renderActions.selectObjects([result.objectId]));
            }
        } else {
            if (alreadySelected) {
                dispatch(renderActions.setMainObject(undefined));
                dispatch(renderActions.setSelectedObjects([]));
            } else {
                dispatch(renderActions.setMainObject(result.objectId));
                dispatch(renderActions.setSelectedObjects([result.objectId]));
            }
        }
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) {
            return;
        }

        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handleDown = async (x: number, y: number) => {
        pointerMoved.current = false;

        if (!view) {
            return;
        }

        const result = await view.pick(x, y);

        if (!result) {
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

    const handleMouseUp = () => {
        handleUp();
    };

    const handleUp = () => {
        if (!view) {
            return;
        }

        if (camera2pointDistance.current > 0 && clippingPlanes.defining) {
            dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, defining: false }));
        }

        camera2pointDistance.current = 0;
        exitPointerLock();
        view.camera.controller.enabled = true;
    };

    const handleMouseMoveNative = (e: MouseEvent) => {
        if (e.movementX === 0 && e.movementY === 0) {
            return;
        }

        handleMove(e);
    };

    const handleMove = (e: MouseEvent | PointerEvent) => {
        pointerMoved.current = true;

        if (
            !view ||
            !canvas ||
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

    const handlePointerDown = (e: PointerEvent) => {
        if (e.pointerType === "mouse") {
            return;
        }

        lastPointerX.current = e.nativeEvent.offsetX;
        lastPointerY.current = e.nativeEvent.offsetY;
        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerType === "mouse") {
            return;
        }

        if (e.movementX === undefined) {
            (e as any).movementX = e.nativeEvent.offsetX - lastPointerX.current;
            (e as any).movementY = e.nativeEvent.offsetY - lastPointerY.current;
        }

        if (
            (!e.movementX && !e.movementY) ||
            (!pointerMoved && e.movementX * e.movementX + e.movementY * e.movementY < 3)
        ) {
            return;
        }

        lastPointerX.current = e.nativeEvent.offsetX;
        lastPointerY.current = e.nativeEvent.offsetY;
        handleMove(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerType === "mouse") {
            return;
        }

        handleUp();
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
                        onMouseMove={handleMouseMoveNative}
                        onMouseUp={handleMouseUp}
                        onPointerEnter={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
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

/**
 * Applies highlights and hides objects in the 3d view based on the object groups provided
 */
function refillObjects({
    api,
    scene,
    view,
    objectGroups,
    viewOnlySelected,
}: {
    api: API;
    scene: Scene;
    view: View;
    objectGroups: ObjectGroup[];
    viewOnlySelected: boolean;
}) {
    if (!view || !scene) {
        return;
    }

    const { objectHighlighter } = scene;

    view.settings.objectHighlights = [
        viewOnlySelected
            ? api.createHighlight({ kind: "transparent", opacity: 0.2 })
            : api.createHighlight({ kind: "neutral" }),
        ...objectGroups.map((group) => api.createHighlight({ kind: "color", color: group.color })),
    ];

    objectHighlighter.objectHighlightIndices.fill(0);

    objectGroups.forEach((group, index) => {
        if (group.selected) {
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = index + 1;
            }
        }
    });

    objectGroups
        .filter((group) => group.hidden)
        .forEach((group) => {
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = 255;
            }
        });

    objectHighlighter.commit();
}

function getEnvironmentDescription(name: string, environments: EnvironmentDescription[]): EnvironmentDescription {
    return environments.find((env) => env.name === name) ?? environments[0];
}

async function waitForSceneToRender(view: View): Promise<void> {
    while (!view.performanceStatistics.renderResolved) {
        await sleep(100);
    }
}

async function getRenderType(view: View): Promise<RenderType> {
    if (!("advanced" in view.settings)) {
        return RenderType.UnChangeable;
    }

    await waitForSceneToRender(view);

    const advancedSettings = (view.settings as Internal.RenderSettingsExt).advanced;
    const points = advancedSettings.hidePoints || view.performanceStatistics.points > 0;
    const triangles = advancedSettings.hideTriangles || view.performanceStatistics.triangles > 1000;
    const canChange = points && triangles;

    return !canChange
        ? RenderType.UnChangeable
        : advancedSettings.hidePoints
        ? RenderType.Triangles
        : advancedSettings.hideTriangles
        ? RenderType.Points
        : RenderType.All;
}

function serializeableObjectGroups(groups: Partial<ObjectGroups>): Partial<ObjectGroups> {
    return Object.fromEntries(
        Object.entries(groups)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => {
                const serializableValue = Array.isArray(value)
                    ? value.map((group) =>
                          group.color instanceof Float32Array
                              ? { ...group, color: [group.color[0], group.color[1], group.color[2]] }
                              : group
                      )
                    : value.color instanceof Float32Array
                    ? { ...value, color: [value.color[0], value.color[1], value.color[2]] }
                    : value;

                return [key, serializableValue];
            })
    );
}

function addConsoleDebugUtils() {
    (window as any).showStats = (val: boolean) =>
        val !== false
            ? localStorage.setItem("show-performance-stats", "true")
            : localStorage.removeItem("show-performance-stats");

    (window as any).disableTaa = (val: boolean) =>
        val !== false ? localStorage.setItem("disable-taa", "true") : localStorage.removeItem("disable-taa");

    (window as any).disableSsao = (val: boolean) =>
        val !== false ? localStorage.setItem("disable-ssao", "true") : localStorage.removeItem("disable-ssao");
}
