import { glMatrix, quat, vec2, vec3 } from "gl-matrix";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import type {
    View,
    API,
    FlightControllerParams,
    Scene,
    RenderSettings,
    EnvironmentDescription,
} from "@novorender/webgl-api";
import type { API as DataAPI, ObjectGroup } from "@novorender/data-js-api";
import { Box, makeStyles } from "@material-ui/core";

import {
    renderActions,
    selectBaseCameraSpeed,
    selectCameraSpeedMultiplier,
    selectCurrentEnvironment,
    selectEnvironments,
    selectMainObject,
    selectObjectGroups,
    selectSavedCameraPositions,
    selectSelectMultiple,
    selectViewOnlySelected,
} from "slices/renderSlice";
import { sleep } from "utils/timers";
import { useAppDispatch } from "app/store";

const useStyles = makeStyles({
    canvas: {
        outline: 0,
        touchAction: "none",
        height: "100vh",
        width: "100vw",
    },
});

type Props = {
    api: API;
    dataApi: DataAPI;
    onInit?: (params: { view: View; customProperties: unknown; title: string }) => void;
};

glMatrix.setMatrixArrayType(Array);

export function Render3D({ api, onInit, dataApi }: Props) {
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

    const running = useRef(true);
    const movementTimer = useRef<ReturnType<typeof setTimeout>>();
    const cameraGeneration = useRef<number>();
    const cameraMoveRef = useRef<ReturnType<typeof requestAnimationFrame>>();

    const [canvas, setCanvas] = useState<null | HTMLCanvasElement>(null);
    const [view, setView] = useState<View>();
    const scene = view?.scene;

    const dispatch = useAppDispatch();

    useEffect(
        function init() {
            async function initView() {
                if (!canvas || !environments.length || view) {
                    return;
                }

                const { url, db, camera, objectGroups, bookmarks, customProperties, title, ...sceneData } =
                    await dataApi.loadScene(
                        window.location.pathname.slice(1)
                            ? window.location.pathname.slice(1)
                            : process.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c"
                    );

                const settings = sceneData.settings ?? ({} as Partial<RenderSettings>);
                const { display: _display, ...customSettings } = settings ?? {};
                const _view = await api.createView(customSettings);
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
                    renderActions.setObjectGroups({
                        default: objectGroups.find((group) => group.name === "default"),
                        defaultHidden: objectGroups.find((group) => group.name === "defaultHidden"),
                        custom: objectGroups.filter((group) => !["default", "defaultHidden"].includes(group.name)),
                    })
                );

                setView(_view);
                run(canvas, _view);
                window.document.title = `${title} - ${window.document.title}`;
                window.addEventListener("blur", blur);
                canvas.focus();

                if (onInit) {
                    onInit({ view: _view, customProperties, title });
                }
            }

            initView();
        },
        [canvas, view, api, dataApi, dispatch, onInit, environments]
    );

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
                // For cypress
                // eslint-disable-next-line
                (window as any).appFullyRendered =
                    view.performanceStatistics.sceneResolved && view.performanceStatistics.renderResolved;

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

    useEffect(function cleanUp() {
        return () => {
            window.removeEventListener("blur", blur);
            running.current = false;
        };
    }, []);

    const run = async (canvas: HTMLCanvasElement, view: View) => {
        const ctx = canvas.getContext("2d", { alpha: true, desynchronized: false })!;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                canvas.width = entry.contentRect.width;
                canvas.height = entry.contentRect.height;
                view.applySettings({ display: { width: canvas.width, height: canvas.height } });
            }
        });

        await sleep(500);
        resizeObserver.observe(canvas);

        while (running.current) {
            const output = await view.render();
            const { width, height } = canvas;
            const ssaoEnabled = false;
            const taaEnabled = false;
            const badPerf = view.performanceStatistics.weakDevice || view.settings.quality.resolution.value < 1;
            {
                if (ssaoEnabled && !badPerf) {
                    output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: true });
                }
                const image = await output.getImage();
                if (image) {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                    // ctx.transferFromImageBitmap(image); // display in canvas
                }
            }
            let run = taaEnabled;
            let reset = true;
            const start = performance.now();
            while (run) {
                if (output.hasViewChanged) {
                    break;
                }
                if (performance.now() - start < 500) {
                    await sleep(1);
                    continue;
                }
                run = (await output.applyPostEffect({ kind: "taa", reset })) || false;
                if (ssaoEnabled) {
                    output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: reset && badPerf });
                }
                reset = false;
                const image = await output.getImage();
                if (image) {
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
            <canvas className={classes.canvas} tabIndex={1} ref={setCanvas} onClick={click} />
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
