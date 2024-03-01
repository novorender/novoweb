import {
    computeRotation,
    DeviceProfile,
    getDeviceProfile,
    rotationFromDirection,
    TextureDescription,
    View,
} from "@novorender/api";
import { ObjectDB, SceneData, SceneLoadFail } from "@novorender/data-js-api";
import { Internal } from "@novorender/webgl-api";
import { useLazyGetProjectQuery } from "apis/dataV2/dataV2Api";
import { getGPUTier } from "detect-gpu";
import { quat, vec3, vec4 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { dataApi } from "app";
import { useAppDispatch } from "app/store";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useSceneId } from "hooks/useSceneId";
import { ProjectType } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { CustomProperties } from "types/project";
import { VecRGBA } from "utils/color";
import { sleep } from "utils/time";

import { renderActions } from "..";
import { ErrorKind } from "../sceneError";
import { flip } from "../utils";

export function useHandleInit() {
    const sceneId = useSceneId();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { canvas },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();

    const [getProject] = useLazyGetProjectQuery();

    const initialized = useRef(false);

    useEffect(() => {
        initView();

        async function initView() {
            if (initialized.current || !canvas) {
                return;
            }

            initialized.current = true;
            dispatch(renderActions.setSceneStatus({ status: AsyncStatus.Loading }));

            const detectedTier = await loadDeviceTier();
            const storedDeviceProfile = getStoredDeviceProfile();
            const deviceProfile = storedDeviceProfile
                ? { ...storedDeviceProfile, isMobile: detectedTier.isMobile }
                : {
                      ...detectedTier,
                      ...(detectedTier.tier >= 0
                          ? getDeviceProfile(detectedTier.tier as DeviceProfile["tier"])
                          : getDeviceProfile(0)),
                  };

            const view = await createView(canvas, { deviceProfile });

            try {
                const [{ url: _url, db, ...sceneData }, camera] = await loadScene(sceneId);
                const url = new URL(_url);
                const parentSceneId = url.pathname.replaceAll("/", "");
                url.pathname = "";
                const octreeSceneConfig = await view.loadScene(
                    url,
                    parentSceneId,
                    "index.json",
                    new AbortController().signal
                );
                const projectIsV2 = Boolean(
                    await getProject({ projectId: sceneId })
                        .unwrap()
                        .catch(() => false)
                );

                const offlineWorkerState =
                    view.offline &&
                    (await view.manageOfflineStorage().catch((e) => {
                        console.warn("view.manageOfflineStorage():", e);
                        return undefined;
                    }));
                view.run();

                while (!view.renderState.scene) {
                    await sleep(50);
                }

                if (!camera) {
                    view.activeController.autoFit(
                        view.renderState.scene.config.boundingSphere.center,
                        view.renderState.scene.config.boundingSphere.radius
                    );

                    // 1sec autofit flight duration
                    await sleep(1000);
                }

                dispatch(
                    renderActions.initScene({
                        projectType: projectIsV2 ? ProjectType.V2 : ProjectType.V1,
                        sceneData,
                        sceneConfig: octreeSceneConfig,
                        initialCamera: {
                            kind: camera?.kind ?? view.renderState.camera.kind,
                            position: vec3.clone(camera?.position ?? view.renderState.camera.position),
                            rotation: quat.clone(camera?.rotation ?? view.renderState.camera.rotation),
                            fov: camera?.fov ?? view.renderState.camera.fov,
                        },
                        deviceProfile,
                    })
                );

                dispatchObjectGroups(
                    objectGroupsActions.set(
                        sceneData.objectGroups
                            .filter((group) => group.id && group.search)
                            .map((group) => {
                                let texture: TextureDescription | undefined = undefined;

                                try {
                                    const stored = localStorage.getItem(`textures-${group.id}`);

                                    if (stored) {
                                        texture = JSON.parse(stored);
                                    }
                                } catch {
                                    localStorage.removeItem(`textures-${group.id}`);
                                }

                                return {
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
                                        : GroupStatus.None,
                                    // NOTE(OLA): Pass IDs as undefined to be loaded when group is activated.
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    ids: group.ids ? new Set(group.ids) : (undefined as any),
                                    texture,
                                };
                            })
                    )
                );
                dispatchHighlighted(
                    highlightActions.setColor(sceneData.customProperties.highlights?.primary.color ?? [1, 0, 0, 1])
                );
                dispatchHighlightCollections(
                    highlightCollectionsActions.setColor(
                        HighlightCollection.SecondaryHighlight,
                        sceneData.customProperties.highlights?.secondary.color ?? [1, 1, 0, 1]
                    )
                );

                window.document.title = `${sceneData.title} - Novorender`;
                const resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        dispatchGlobals(
                            explorerGlobalsActions.update({
                                size: {
                                    width: entry.contentRect.width,
                                    height: entry.contentRect.height,
                                },
                            })
                        );
                    }
                });

                resizeObserver.observe(canvas);
                dispatchGlobals(
                    explorerGlobalsActions.update({
                        db: db as ObjectDB,
                        view: view,
                        scene: octreeSceneConfig,
                        offlineWorkerState,
                    })
                );

                await sleep(2000);
                dispatch(renderActions.setSceneStatus({ status: AsyncStatus.Success, data: undefined }));
            } catch (e) {
                console.warn(e);
                if (e && typeof e === "object" && "error" in e) {
                    const error = (e as { error: string }).error;

                    if (error === "Not authorized") {
                        dispatch(
                            renderActions.setSceneStatus({ status: AsyncStatus.Error, msg: ErrorKind.NOT_AUTHORIZED })
                        );
                    } else if (error === "Scene not found") {
                        dispatch(
                            renderActions.setSceneStatus({ status: AsyncStatus.Error, msg: ErrorKind.INVALID_SCENE })
                        );
                    } else if (error === "Scene deleted") {
                        dispatch(
                            renderActions.setSceneStatus({ status: AsyncStatus.Error, msg: ErrorKind.DELETED_SCENE })
                        );
                    } else {
                        dispatch(
                            renderActions.setSceneStatus({
                                status: AsyncStatus.Error,
                                msg: navigator.onLine ? ErrorKind.UNKNOWN_ERROR : ErrorKind.OFFLINE_UNAVAILABLE,
                            })
                        );
                    }
                } else if (e instanceof Error) {
                    if (e.message === "HTTP Error:404 404") {
                        dispatch(
                            renderActions.setSceneStatus({
                                status: AsyncStatus.Error,
                                msg: ErrorKind.LEGACY_BINARY_FORMAT,
                            })
                        );
                    } else {
                        dispatch(
                            renderActions.setSceneStatus({
                                status: AsyncStatus.Error,
                                msg: navigator.onLine ? ErrorKind.UNKNOWN_ERROR : ErrorKind.OFFLINE_UNAVAILABLE,
                                stack: e.stack
                                    ? e.stack
                                    : typeof e.cause === "string"
                                    ? e.cause
                                    : `${e.name}: ${e.message}`,
                            })
                        );
                    }
                }
            }
        }
    }, [
        canvas,
        dispatch,
        sceneId,
        dispatchGlobals,
        dispatchObjectGroups,
        dispatchHighlighted,
        dispatchHighlightCollections,
        getProject,
    ]);
}

export type SceneConfig = Omit<SceneData, "settings" | "customProperties"> & {
    settings: Internal.RenderSettingsExt;
    customProperties: CustomProperties;
};

export type CadCamera = { kind: "pinhole" | "orthographic"; position: vec3; rotation: quat; fov: number };
export async function loadScene(id: string): Promise<[SceneConfig, CadCamera | undefined]> {
    const res: (SceneData & { version?: string }) | SceneLoadFail = await dataApi.loadScene(id);
    let camera: CadCamera | undefined = undefined;

    if ("error" in res) {
        throw res;
    }

    const { ..._cfg } = res;
    const cfg = _cfg as SceneConfig;

    // Legacy scene config format
    // needs to be flipped.
    if (!cfg.customProperties?.initialCameraState) {
        if (cfg.camera && (cfg.camera.kind === "ortho" || cfg.camera.kind === "flight")) {
            camera =
                cfg.camera.kind === "ortho"
                    ? {
                          kind: "orthographic",
                          position: flip([
                              cfg.camera.referenceCoordSys[12],
                              cfg.camera.referenceCoordSys[13],
                              cfg.camera.referenceCoordSys[14],
                          ]),
                          rotation: rotationFromDirection(
                              flip([
                                  cfg.camera.referenceCoordSys[8],
                                  cfg.camera.referenceCoordSys[9],
                                  cfg.camera.referenceCoordSys[10],
                              ])
                          ),
                          fov: cfg.camera.fieldOfView,
                      }
                    : {
                          kind: "pinhole",
                          position: flip(cfg.camera.position),
                          rotation: computeRotation(0, cfg.camera.pitch, cfg.camera.yaw),
                          fov: cfg.camera.fieldOfView,
                      };
        }
    } else {
        camera = cfg.customProperties.initialCameraState;
    }

    if (!cfg.customProperties.explorerProjectState && cfg.settings && cfg.settings.background) {
        cfg.settings.background.color = getBackgroundColor(cfg.settings.background.color);
    }

    return [cfg, camera];
}

function getBackgroundColor(color: vec4 | undefined): vec4 {
    const grey: vec4 = [0.75, 0.75, 0.75, 1];
    const legacyBlue: vec4 = [0, 0, 0.25, 1];

    if (!color || vec4.exactEquals(color, legacyBlue)) {
        return grey;
    }

    return color;
}

function getStoredDeviceProfile(): (DeviceProfile & { debugProfile: true; tier: 0 }) | undefined {
    try {
        const debugProfile =
            new URLSearchParams(window.location.search).get("debugDeviceProfile") ?? localStorage["debugDeviceProfile"];

        if (debugProfile) {
            return { tier: 0, ...JSON.parse(debugProfile), debugProfile: true };
        }
    } catch (e) {
        console.warn(e);
    }
}

async function loadDeviceTier(): Promise<{ tier: -1 | DeviceProfile["tier"]; isMobile: boolean }> {
    try {
        const tiers = [0, 50, 75, 300];
        const tierResult = await getGPUTier({
            mobileTiers: tiers,
            desktopTiers: tiers,
        });
        const isApple = tierResult.device?.includes("apple") || false;
        const { isMobile, ...gpuTier } = tierResult;
        let { tier } = gpuTier;

        // GPU is obscured on apple mobile devices and the result is usually much worse than the actual device's GPU.
        if (isMobile && isApple) {
            tier = Math.max(1, tier);
        }

        // All RTX cards belong in tier 3+, but some such as A3000 are not benchmarked and returns tier 1.
        if (gpuTier.gpu && /RTX/gi.test(gpuTier.gpu)) {
            tier = Math.max(3, tier);
        }

        // Intel HD Graphics are given tier 2 for some reason, but belonging in tier 0.
        // " " before HD in regex to not catch UHD
        if (gpuTier.gpu && / HD Graphics /gi.test(gpuTier.gpu)) {
            tier = 0;
        }

        if (gpuTier.gpu && /Quadro/gi.test(gpuTier.gpu)) {
            tier = Math.max(2, tier);
        }

        return {
            tier: tier as DeviceProfile["tier"],
            isMobile: isMobile ?? false,
        };
    } catch (e) {
        console.warn(e);
        return {
            tier: -1,
            isMobile: false,
        };
    }
}

async function createView(canvas: HTMLCanvasElement, options?: { deviceProfile?: DeviceProfile }): Promise<View> {
    const deviceProfile = options?.deviceProfile ?? getDeviceProfile(0);
    const url = new URL("/novorender/api/", window.location.origin);

    const imports = await View.downloadImports({ baseUrl: url });
    return new View(canvas, deviceProfile, imports);
}
