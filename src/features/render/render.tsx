import { glMatrix, vec4 } from "gl-matrix";
import { useEffect, useState, useRef, useCallback, RefCallback } from "react";
import { Box, styled, css } from "@mui/material";

import { PerformanceStats } from "features/performanceStats";
import { getDataFromUrlHash } from "features/shareLink";
import { LinearProgress, Loading } from "components";
import { api, dataApi, measureApi } from "app";
import { useSceneId } from "hooks/useSceneId";
import {
    renderActions,
    selectEnvironments,
    selectAdvancedSettings,
    selectLoadingHandles,
} from "features/render/renderSlice";
import { explorerActions, selectLocalBookmarkId, selectUrlBookmarkId } from "slices/explorerSlice";
import { useSelectBookmark } from "features/bookmarks/useSelectBookmark";
import { useAppDispatch, useAppSelector } from "app/store";
import { Engine2D } from "features/engine2D";

import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchHidden } from "contexts/hidden";
import { useDispatchObjectGroups } from "contexts/objectGroups";
import { useDispatchSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";

import {
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
    initProjectSettings,
    initCameraSpeedLevels,
    initProportionalCameraSpeed,
    initPointerLock,
    initDefaultTopDownElevation,
    initPropertiesSettings,
} from "./utils";
import { Stamp } from "./stamp";
import { Markers } from "./markers";
import { isSceneError, SceneError } from "./sceneError";
import { Images } from "./images";
import { SceneData } from "@novorender/data-js-api";
import { EnvironmentDescription, View } from "@novorender/web_app";
import { createView } from "@novorender/web_app";

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

export function Render3D({ onInit }: { onInit: (params: { customProperties: unknown }) => void }) {
    const sceneId = useSceneId();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchHidden = useDispatchHidden();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { view, canvas },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();
    const selectBookmark = useSelectBookmark();

    const environments = useAppSelector(selectEnvironments);
    const advancedSettings = useAppSelector(selectAdvancedSettings);
    const urlBookmarkId = useAppSelector(selectUrlBookmarkId);
    const localBookmarkId = useAppSelector(selectLocalBookmarkId);
    const loadingHandles = useAppSelector(selectLoadingHandles);

    const dispatch = useAppDispatch();

    const rendering = useRef({
        start: () => Promise.resolve(),
        stop: () => {},
        update: () => {},
    } as ReturnType<typeof createRendering>);
    const cameraGeneration = useRef<number>();
    const previousSceneId = useRef("");
    const pointerPos = useRef([0, 0] as [x: number, y: number]);

    const [svg, setSvg] = useState<null | SVGSVGElement>(null);
    const [status, setStatus] = useState<{ status: Status; msg?: string }>({ status: Status.Initial });

    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    useEffect(() => {
        if (!!false) {
            initView_OLD();
        } else {
            initView();
        }

        async function initView() {
            if (previousSceneId.current === sceneId || !canvas || view) {
                return;
            }

            previousSceneId.current = sceneId;

            const _view = createView(canvas);

            try {
                const { url, db: _db } = await loadScene("e392ab0d4e6746eca14781233b1bfc02");
                const { settings, customProperties, ...sceneData } = await loadScene(
                    "092cd4c90e804fb0a8f31dc7a26301b7"
                );

                if (sceneData.camera?.kind === "flight") {
                    _view.controllers.flight.moveTo(flip(sceneData.camera.position as Vec3), 0.001);
                }

                const _scene = await _view.loadScene(url, undefined, undefined);
                _view.run();

                onInit({ customProperties });

                dispatchGlobals(
                    explorerGlobalsActions.update({
                        view: _view,
                        scene: _scene,
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

        async function initView_OLD() {
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
                const camera = { kind: "flight", ...sceneData.camera, ...urlData.camera } as any;
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

                // const controller = initCamera({
                //     canvas,
                //     camera,
                //     view: _view,
                //     // flightControllerRef: flightController,
                // });

                // if (!sceneData.camera && !urlData.camera) {
                //     controller.autoZoomToScene = true;
                // }

                cameraGeneration.current = _view.performanceStatistics.cameraGeneration;

                if (window.self === window.top || !customProperties?.enabledFeatures?.transparentBackground) {
                    initEnvironment(settings.environment as unknown as any, environments, _view);
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
                    <Canvas id="main-canvas" tabIndex={1} ref={canvasRef} />
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

async function loadScene(id: string): Promise<SceneData> {
    const res = await dataApi.loadScene(id);

    if ("error" in res) {
        throw res;
    }

    return res;
}

async function initEnv(
    view: View,
    _settings: SceneData["settings"],
    customProperties: SceneData["customProperties"]
): Promise<[string, EnvironmentDescription[]]> {
    const envs = await view.availableEnvironments("https://api.novorender.com/assets/env/index.json");

    if (window.self !== window.top || customProperties?.enabledFeatures?.transparentBackground) {
        return ["", envs];
    }

    if (envs.length) {
        return [envs[0].url, envs];
    }

    return ["", envs];
}

function flip<T extends number[]>(v: T): T {
    const flipped = [...v];
    flipped[1] = -v[2];
    flipped[2] = v[1];
    return flipped as T;
}
