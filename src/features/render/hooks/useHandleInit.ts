import { DeviceProfile, getDeviceProfile, View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { SearchOptions } from "@novorender/webgl-api";
import { getGPUTier } from "detect-gpu";
import { useEffect, useRef } from "react";

import {
    useLazyCheckPermissionsQuery,
    useLazyGetExplorerInfoQuery,
    useLazyGetProjectQuery,
} from "apis/dataV2/dataV2Api";
import { Permission } from "apis/dataV2/permissions";
import { ProjectInfo } from "apis/dataV2/projectTypes";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, ObjectGroup, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useFillGroupIds } from "hooks/useFillGroupIds";
import { useSceneId } from "hooks/useSceneId";
import { ProjectType, selectConfig } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { VecRGBA } from "utils/color";
import { sleep } from "utils/time";

import { renderActions } from "../renderSlice";
import { ErrorKind } from "../sceneError";
import { getDefaultCamera, loadScene } from "../utils";

export function useHandleInit() {
    const sceneId = useSceneId();
    const config = useAppSelector(selectConfig);
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { canvas },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();

    const [getProject] = useLazyGetProjectQuery();
    const [checkPermissions] = useLazyCheckPermissionsQuery();
    const [getExplorerInfo] = useLazyGetExplorerInfoQuery();
    const fillGroupIds = useFillGroupIds();

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
                const [{ url: _url, db, ...sceneData }, sceneCamera] = await loadScene(sceneId);

                const projectV2 = await getProject({ projectId: sceneId })
                    .unwrap()
                    .catch((e) => {
                        if (e.status === 401) {
                            throw { error: "Not authorized" };
                        }
                        throw e;
                    });

                const projectIsV2 = Boolean(projectV2);
                const [tmZoneForCalc, permissions, explorerInfo] = await Promise.all([
                    loadTmZoneForCalc(projectV2, sceneData.tmZone),
                    checkPermissions({
                        scope: { organizationId: sceneData.organization, projectId: sceneId },
                        permissions: Object.values(Permission),
                    }).unwrap(),
                    getExplorerInfo({ projectId: sceneId }).unwrap(),
                ]);

                const url = new URL(explorerInfo.url);
                const parentSceneId = url.pathname.replaceAll("/", "");
                url.pathname = "";
                const octreeSceneConfig = await view.loadScene(
                    url,
                    parentSceneId,
                    "index.json",
                    new AbortController().signal
                );

                const offlineWorkerState =
                    view.offline &&
                    (await view.manageOfflineStorage().catch((e) => {
                        console.warn("view.manageOfflineStorage():", e);
                        return undefined;
                    }));
                view.run();

                dispatch(
                    renderActions.initScene({
                        projectType: projectIsV2 ? ProjectType.V2 : ProjectType.V1,
                        projectV2Info: projectV2 ? { ...projectV2, permissions } : null,
                        explorerInfo,
                        tmZoneForCalc,
                        sceneData,
                        sceneConfig: octreeSceneConfig,
                        initialCamera: sceneCamera ?? getDefaultCamera(projectV2?.bounds) ?? view.renderState.camera,
                        deviceProfile,
                    })
                );

                const groups: ObjectGroup[] = sceneData.objectGroups
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
                            : group.frozen
                            ? GroupStatus.Frozen
                            : GroupStatus.None,
                        // NOTE(OLA): Pass IDs as undefined to be loaded when group is activated.
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ids: group.ids ? new Set(group.ids) : (undefined as any),
                    }));

                // Ensure frozen groups are loaded before rendering anything to not even put them into memory
                // (some scenes on some devices may crash upon loading because there's too much data)
                await fillGroupIds(
                    groups.filter((g) => g.status === GroupStatus.Frozen),
                    sceneId
                );

                dispatchObjectGroups(objectGroupsActions.set(groups));
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

                patchDb(db, config.dataV2ServerUrl, sceneId);

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
        getExplorerInfo,
        checkPermissions,
        config,
        fillGroupIds,
    ]);
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
    const view = new View(canvas, deviceProfile, imports);
    view.controllers.flight.input.mouseMoveSensitivity = 4;
    return view;
}

async function loadTmZoneForCalc(projectV2: ProjectInfo | undefined, tmZoneV1: string | undefined) {
    if (projectV2) {
        if (projectV2.epsg) {
            const resp = await fetch(`https://epsg.io/${projectV2.epsg}.wkt`);
            if (resp.ok) {
                return resp.text();
            } else {
                console.warn(resp.text());
            }
        }
    } else {
        return tmZoneV1;
    }
}

// TODO(ND): remove patches once API is updated
// Some changes to ObjectDB to make it work with data-v2 without changing lib internals
// and changing all the search calls
function patchDb(db: ObjectDB | undefined, dataV2ServerUrl: string, sceneId: string) {
    if (!db) {
        return;
    }

    // Override object metadata URL
    const patchedDb = db as ObjectDB & { url: string };
    patchedDb.url = `${dataV2ServerUrl}/projects/${sceneId}`;
    const originalGetObjectMetdata = patchedDb.getObjectMetdata.bind(patchedDb);
    patchedDb.getObjectMetdata = (id: number) => {
        patchedDb.url = `${dataV2ServerUrl}/projects/${sceneId}/metadata`;
        const result = originalGetObjectMetdata(id);
        patchedDb.url = `${dataV2ServerUrl}/projects/${sceneId}`;
        return result;
    };

    // Search no longer accepts simple string when seaching nor single string for `value`
    const originalSearch = patchedDb.search.bind(patchedDb);
    patchedDb.search = (filter: SearchOptions, signal: AbortSignal | undefined) => {
        const searchPattern =
            typeof filter.searchPattern === "string"
                ? [{ value: [filter.searchPattern] }]
                : filter.searchPattern?.map((pattern) => {
                      if (typeof pattern.value === "string") {
                          return { ...pattern, value: [pattern.value] };
                      }
                      return pattern;
                  });

        return originalSearch({ ...filter, searchPattern }, signal);
    };
}
