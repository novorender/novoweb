import { glMatrix, quat, vec2, vec3 } from "gl-matrix";
import { useEffect, useState, useRef } from "react";
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

const showPerformance = localStorage.getItem("show-performance-stats") !== null;
const taaEnabled = localStorage.getItem("disable-taa") === null;
const ssaoEnabled = localStorage.getItem("disable-ssao") === null;

glMatrix.setMatrixArrayType(Array);
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
    const dispatch = useAppDispatch();

    const running = useRef(false);
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const cameraMoveRef = useRef<ReturnType<typeof requestAnimationFrame>>();
    const previousId = useRef("");

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
                window.addEventListener("blur", blur);
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
        function cleanUpPreviousScene() {
            return () => {
                window.removeEventListener("blur", blur);
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

    const blur = () => {
        window.document.exitPointerLock();
    };

    const click = (e: React.MouseEvent) => {
        selectObject(vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY));
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

    return (
        <Box position="relative" width="100%" height="100%">
            {status === Status.Error ? (
                <NoScene id={id} />
            ) : (
                <>
                    {showPerformance && view && canvas ? <PerformanceStats view={view} canvas={canvas} /> : null}
                    <canvas className={classes.canvas} tabIndex={1} ref={setCanvas} onClick={click} />
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
