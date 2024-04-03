import { OfflineViewState, View } from "@novorender/api";
import { useCallback, useEffect } from "react";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";

import { offlineActions, selectOfflineAction } from "./offlineSlice";

type OfflineSceneMeta = {
    id: string;
    name: string;
    lastSynced: string;
    viewerScenes: { name: string; id: string; lastSynced: string }[];
};

const offlineSceneStorageKey = (parentSceneId: string) => `offline_scene/${parentSceneId}`;
const storage = {
    get: (parentSceneId: string): OfflineSceneMeta | undefined => {
        const stored = localStorage.getItem(offlineSceneStorageKey(parentSceneId));

        if (!stored) {
            return;
        }

        try {
            const scene = JSON.parse(stored) as OfflineSceneMeta;
            return scene;
        } catch (e) {
            console.warn(e);
            localStorage.removeItem(offlineSceneStorageKey(parentSceneId));
        }
    },
    set: (scene: OfflineSceneMeta): void => {
        localStorage.setItem(offlineSceneStorageKey(scene.id), JSON.stringify(scene));
    },
    remove: (parentSceneId: string): void => {
        localStorage.removeItem(offlineSceneStorageKey(parentSceneId));
    },
};

export function useHandleOffline() {
    const viewerSceneId = useSceneId();
    const {
        state: { offlineWorkerState, view },
    } = useExplorerGlobals();
    const user = useAppSelector(selectUser);

    const action = useAppSelector(selectOfflineAction);
    const [abortController, abort] = useAbortController();
    const createLogger = useCreateLogger();
    const dispatch = useAppDispatch();

    useEffect(
        function initOfflineScenes() {
            if (!offlineWorkerState || !view?.renderState.scene?.config.id) {
                return;
            }

            [...offlineWorkerState.scenes.values()].forEach((scene) => {
                const meta = storage.get(scene.id);

                if (!meta) {
                    return;
                }

                dispatch(
                    offlineActions.addScene({
                        id: scene.id,
                        name: meta.name,
                        status: scene.manifest.numFiles === 0 ? "incremental" : "synchronized",
                        lastSync: meta.lastSynced,
                        progress: "",
                        scanProgress: "",
                        size: scene.manifest.totalByteSize,
                        viewerScenes: meta.viewerScenes,
                    })
                );

                scene.logger = createLogger(scene.id);
            });
        },
        [offlineWorkerState, dispatch, view, createLogger]
    );

    useEffect(() => {
        handleAction();

        async function handleAction() {
            if (!view?.renderState.scene?.config.id || !offlineWorkerState || !action) {
                return;
            }

            const parentSceneId = view.renderState.scene.config.id;

            switch (action.action) {
                case "delete": {
                    const id = action.id ?? parentSceneId;
                    await offlineWorkerState.scenes.get(id)?.delete();
                    storage.remove(id);
                    dispatch(offlineActions.removeScene(id));
                    break;
                }
                case "pause": {
                    abort();
                    break;
                }
                case "incrementalSync": {
                    const scene =
                        offlineWorkerState.scenes.get(parentSceneId) ??
                        (await offlineWorkerState.addScene(parentSceneId));

                    if (!scene) {
                        break;
                    }

                    if (
                        (await scene.readManifest(getSceneIndexUrl(view), abortController.current.signal)) === undefined
                    ) {
                        dispatch(
                            offlineActions.addScene({
                                id: scene.id,
                                name: scene.id,
                                status: "invalid format",
                                lastSync: new Date().toISOString(),
                                progress: "",
                                scanProgress: "",
                                size: 0,
                                viewerScenes: [],
                            })
                        );
                        break;
                    }

                    const sceneData = await dataApi.loadScene(viewerSceneId);
                    if ("error" in sceneData) {
                        scene.logger?.status("error");
                        break;
                    }

                    await Promise.all([
                        dataApi.getBookmarks(viewerSceneId),
                        user ? dataApi.getBookmarks(viewerSceneId, { personal: true }) : Promise.resolve(),
                        ...sceneData.objectGroups
                            .filter((group) => group.id && !group.ids)
                            .map((group) => dataApi.getGroupIds(viewerSceneId, group.id)),
                    ]);

                    const persisted = await navigator.storage.persisted();
                    if (!persisted) {
                        await navigator.storage.persist();
                    }

                    const meta = storage.get(parentSceneId);
                    const viewerScene = {
                        id: viewerSceneId,
                        name: sceneData.title,
                        lastSynced: new Date().toISOString(),
                    };

                    const toStore = {
                        id: parentSceneId,
                        name: parentSceneId,
                        lastSynced: meta?.lastSynced ?? "",
                        viewerScenes: meta
                            ? meta.viewerScenes.find((vs) => vs.id === viewerSceneId)
                                ? meta.viewerScenes.map((vs) => (vs.id === viewerSceneId ? viewerScene : vs))
                                : meta.viewerScenes.concat(viewerScene)
                            : [viewerScene],
                    };
                    storage.set(toStore);

                    dispatch(
                        offlineActions.addScene({
                            id: scene.id,
                            name: scene.id,
                            status: "incremental",
                            lastSync: toStore.lastSynced,
                            progress: "",
                            scanProgress: "",
                            size: scene.manifest.totalByteSize,
                            viewerScenes: toStore.viewerScenes,
                        })
                    );

                    scene.logger = createLogger(parentSceneId);
                    break;
                }
                case "readSize": {
                    const scene =
                        offlineWorkerState.scenes.get(parentSceneId) ??
                        (await offlineWorkerState.addScene(parentSceneId));

                    if (!scene) {
                        break;
                    }
                    const size = await scene.getUsedSize();
                    dispatch(
                        offlineActions.updateScene({
                            id: parentSceneId,
                            updates: {
                                size,
                            },
                        })
                    );
                    break;
                }
                case "fullSync": {
                    const scene =
                        offlineWorkerState.scenes.get(parentSceneId) ??
                        (await offlineWorkerState.addScene(parentSceneId));

                    if (!scene) {
                        break;
                    }

                    const sceneData = await dataApi.loadScene(viewerSceneId);
                    if ("error" in sceneData) {
                        scene.logger?.status("error");
                        break;
                    }

                    await Promise.all([
                        dataApi.getBookmarks(viewerSceneId),
                        user ? dataApi.getBookmarks(viewerSceneId, { personal: true }) : Promise.resolve(),
                        ...sceneData.objectGroups
                            .filter((group) => group.id && !group.ids)
                            .map((group) => dataApi.getGroupIds(viewerSceneId, group.id)),
                    ]);

                    const persisted = await navigator.storage.persisted();
                    if (!persisted) {
                        await navigator.storage.persist();
                    }

                    const meta = storage.get(parentSceneId);
                    const viewerScene = {
                        id: viewerSceneId,
                        name: sceneData.title,
                        lastSynced: new Date().toISOString(),
                    };

                    const toStore = {
                        id: parentSceneId,
                        name: parentSceneId,
                        lastSynced: meta?.lastSynced ?? "",
                        viewerScenes: meta
                            ? meta.viewerScenes.find((vs) => vs.id === viewerSceneId)
                                ? meta.viewerScenes.map((vs) => (vs.id === viewerSceneId ? viewerScene : vs))
                                : meta.viewerScenes.concat(viewerScene)
                            : [viewerScene],
                    };
                    storage.set(toStore);

                    scene.logger = createLogger(parentSceneId);
                    dispatch(
                        offlineActions.addScene({
                            id: scene.id,
                            name: scene.id,
                            status: "incremental",
                            lastSync: toStore.lastSynced,
                            progress: "",
                            scanProgress: "",
                            size: scene.manifest.totalByteSize,
                            viewerScenes: toStore.viewerScenes,
                        })
                    );
                    scene.sync(getSceneIndexUrl(view), abortController.current.signal);
                    break;
                }
            }

            dispatch(offlineActions.setAction(undefined));
        }
    }, [action, dispatch, offlineWorkerState, view, abort, abortController, createLogger, viewerSceneId, user]);
}

function useCreateLogger() {
    const {
        state: { offlineWorkerState },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();

    const createLogger = useCallback(
        (parentSceneId: string): OfflineViewState["logger"] => {
            return {
                status: (status) => {
                    if (status === "synchronized") {
                        const now = new Date().toISOString();
                        const scene = storage.get(parentSceneId);
                        if (scene) {
                            storage.set({
                                ...scene,
                                lastSynced: now,
                            });
                        }
                        dispatch(
                            offlineActions.updateScene({
                                id: parentSceneId,
                                updates: {
                                    status,
                                    lastSync: now,
                                    size: offlineWorkerState?.scenes.get(parentSceneId)?.manifest.totalByteSize ?? 0,
                                },
                            })
                        );
                    } else {
                        dispatch(offlineActions.updateScene({ id: parentSceneId, updates: { status } }));
                    }
                },
                error: (error) => {
                    console.warn(error);
                },
                progress: (current, max, operation) => {
                    if (operation === "download") {
                        if (current === max) {
                            dispatch(
                                offlineActions.updateScene({
                                    id: parentSceneId,
                                    updates: { progress: "100%", size: max },
                                })
                            );
                        }

                        if (!max) {
                            dispatch(offlineActions.updateScene({ id: parentSceneId, updates: { progress: "" } }));
                        }

                        if (current !== undefined && max !== undefined) {
                            const progress = ((current / max) * 100).toFixed(2);
                            dispatch(
                                offlineActions.updateScene({ id: parentSceneId, updates: { progress, size: max } })
                            );
                        }
                    } else {
                        if (current === max) {
                            dispatch(
                                offlineActions.updateScene({ id: parentSceneId, updates: { scanProgress: "100%" } })
                            );
                        }

                        if (!max) {
                            dispatch(
                                offlineActions.updateScene({
                                    id: parentSceneId,
                                    updates: { scanProgress: String(current) },
                                })
                            );
                        }

                        if (current !== undefined && max !== undefined) {
                            const scanProgress = ((current / max) * 100).toFixed(2);
                            dispatch(offlineActions.updateScene({ id: parentSceneId, updates: { scanProgress } }));
                        }
                    }
                },
            };
        },
        [dispatch, offlineWorkerState]
    );

    return createLogger;
}

function getSceneIndexUrl(view: View): URL {
    const url = view.renderState.scene?.url ? new URL(view.renderState.scene.url) : undefined;

    if (!url) {
        throw new Error("Unable to parse url for SAS key");
    }

    url.pathname += "index.json";

    return url;
}
