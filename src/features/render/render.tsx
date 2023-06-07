import { SceneData, SceneLoadFail } from "@novorender/data-js-api";
import { computeRotation, rotationFromDirection, createView } from "@novorender/web_app";
import { glMatrix, quat, vec3, vec4 } from "gl-matrix";
import { useEffect, useState, useRef, useCallback, RefCallback } from "react";
import { Box, styled, css } from "@mui/material";

import { PerformanceStats } from "features/performanceStats";
import { LinearProgress, Loading } from "components";
import { dataApi } from "app";
import { useSceneId } from "hooks/useSceneId";
import {
    renderActions,
    selectEnvironments,
    selectAdvancedSettings,
    selectLoadingHandles,
    DeepMutable,
} from "features/render/renderSlice";
import { selectLocalBookmarkId, selectUrlBookmarkId } from "slices/explorerSlice";
import { useSelectBookmark } from "features/bookmarks/useSelectBookmark";
import { useAppDispatch, useAppSelector } from "app/store";
import { Engine2D } from "features/engine2D";
import { useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchHidden } from "contexts/hidden";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useDispatchSelectionBasket } from "contexts/selectionBasket";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import { useDispatchHighlightCollections } from "contexts/highlightCollections";
import { VecRGBA } from "utils/color";

import { isSceneError, SceneError } from "./sceneError";
import { createRendering } from "./utils";
import { Stamp } from "./stamp";
import { Markers } from "./markers";
import { Images } from "./images";
import { useHandleBackground } from "./hooks/useHandleBackground";
import { useHandleHighlights } from "./hooks/useHandleHighlights";

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
        initView();

        async function initView() {
            if (previousSceneId.current === sceneId || !canvas || view) {
                return;
            }

            previousSceneId.current = sceneId;

            const _view = createView(canvas);

            try {
                const { url, db: _db, ...sceneData } = await loadScene(sceneId);

                const _scene = await _view.loadScene(url, undefined, undefined);

                // TODO(?): Set in initScene() and handle effect?
                if (sceneData.camera) {
                    await _view.switchCameraController(sceneData.camera.kind, {
                        position: sceneData.camera.position,
                        rotation: sceneData.camera.rotation,
                    });
                }

                dispatch(renderActions.initScene(sceneData));
                dispatchObjectGroups(
                    objectGroupsActions.set(
                        sceneData.objectGroups
                            .filter((group) => group.id && group.search)
                            .map((group) => ({
                                name: group.name,
                                id: group.id,
                                grouping: group.grouping ?? "",
                                color: group.color ?? ([1, 0, 0, 1] as VecRGBA),
                                opacity: group.opacity ?? 0,
                                search: group.search ?? [],
                                includeDescendants: group.includeDescendants ?? true,
                                status: group.selected
                                    ? GroupStatus.Selected
                                    : group.hidden
                                    ? GroupStatus.Hidden
                                    : GroupStatus.Default,
                                ids: group.ids ? new Set(group.ids) : (undefined as any), // TODO?
                            }))
                    )
                );

                _view.run();
                window.document.title = `${sceneData.title} - Novorender`;
                const resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        canvas.width = entry.contentRect.width;
                        canvas.height = entry.contentRect.height;
                        dispatchGlobals(
                            explorerGlobalsActions.update({ size: { width: canvas.width, height: canvas.height } })
                        );
                    }
                });

                resizeObserver.observe(canvas);
                onInit({ customProperties: sceneData.customProperties });
                dispatch(renderActions.setEnvironments(environments));
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

    useHandleBackground();
    useHandleHighlights();

    window.view = view;

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
                    {view && <PerformanceStats />}
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

export type SceneConfig = Omit<DeepMutable<SceneData>, "camera" | "environment"> & {
    camera?: { kind: string; position: vec3; rotation: quat; fov: number };
    environment: string;
    version?: string;
};
async function loadScene(id: string): Promise<SceneConfig> {
    const res: (SceneData & { version?: string }) | SceneLoadFail = await dataApi.loadScene(id);

    if ("error" in res) {
        throw res;
    }

    let { camera, ..._cfg } = res;
    const cfg = _cfg as SceneConfig;

    // Legacy scene config format
    // needs to be flipped.
    if (!cfg.version) {
        if (!camera || !(camera.kind === "ortho" || camera.kind === "flight")) {
            return cfg;
        }

        cfg.camera =
            camera.kind === "ortho"
                ? {
                      kind: "ortho",
                      position: flip([
                          camera.referenceCoordSys[12],
                          camera.referenceCoordSys[13],
                          camera.referenceCoordSys[14],
                      ]),
                      rotation: rotationFromDirection(
                          flip([camera.referenceCoordSys[8], camera.referenceCoordSys[9], camera.referenceCoordSys[10]])
                      ),
                      fov: camera.fieldOfView,
                  }
                : {
                      kind: "flight",
                      position: flip(camera.position),
                      rotation: computeRotation(0, camera.pitch, camera.yaw),
                      fov: camera.fieldOfView,
                  };

        cfg.environment = cfg.settings?.environment
            ? "https://api.novorender.com/assets/env/" + (cfg.settings.environment as any as string) + "/"
            : "";
    }

    if (cfg.settings && cfg.settings.background) {
        cfg.settings.background.color = getBackgroundColor(cfg.settings.background.color);
    }

    return cfg;
}

function flip<T extends number[]>(v: T): T {
    const flipped = [...v];
    flipped[1] = -v[2];
    flipped[2] = v[1];
    return flipped as T;
}

function flipClippingPlane(plane: Vec4): Vec4 {
    const flipped = flip(plane);
    flipped[3] *= -1;
    return flipped;
}

function getBackgroundColor(color: Vec4 | undefined): Vec4 {
    const grey: Vec4 = [0.75, 0.75, 0.75, 1];
    const legacyBlue: Vec4 = [0, 0, 0.25, 1];

    if (!color || vec4.equals(color, legacyBlue)) {
        return grey;
    }

    return color;
}

export type CustomProperties = {
    enabledFeatures?: Record<string, boolean>;
    showStats?: boolean;
    navigationCube?: boolean;
    ditioProjectNumber?: string;
    flightMouseButtonMap?: {
        rotate: number;
        pan: number;
        orbit: number;
        pivot: number;
    };
    flightFingerMap?: {
        rotate: number;
        pan: number;
        orbit: number;
        pivot: number;
    };
    autoFps?: boolean;
    maxTriangles?: number;
    triangleLimit?: number;
    jiraSettings?: {
        space: string;
        project: string;
        component: string;
    };
    primaryMenu?: {
        button1: string;
        button2: string;
        button3: string;
        button4: string;
        button5: string;
    };
    xsiteManageSettings?: {
        siteId: string;
    };
    highlights?: {
        primary: {
            color: vec4;
        };
        secondary: {
            color: vec4;
            property: string;
        };
    };
    cameraSpeedLevels?: {
        flight: {
            slow: number;
            default: number;
            fast: number;
        };
    };
    pointerLock?: {
        ortho: boolean;
    };
    proportionalCameraSpeed?: {
        enabled: boolean;
        min: number;
        max: number;
        pickDelay: number;
    };
    defaultTopDownElevation?: number;
    properties?: {
        stampSettings: {
            enabled: boolean;
            properties: string[];
        };
        starred: string[];
    };
    canvasContextMenu?: {
        features: string[];
    };
    requireConsent?: boolean;
    features?: {
        render?: {
            full: boolean;
        };
        debugInfo?: {
            quality?: boolean;
            boundingBoxes?: boolean;
            holdDynamic?: boolean;
            render?: boolean;
            queueSize?: boolean;
            performanceTab?: boolean;
        };
        doubleSided?: boolean;
        bakeResources?: boolean;
        vr?: boolean;
        BIM360?: boolean;
        BIMCollab?: boolean;
        bimcollab?: boolean;
        bimTrack?: boolean;
        ditio?: boolean;
        jira?: boolean;
        xsiteManage?: boolean;
    };
};
export function getCustomProperties(customProperties: any = {}): CustomProperties {
    if (!customProperties || typeof customProperties !== "object") {
        return {};
    }

    return customProperties as CustomProperties;
}
