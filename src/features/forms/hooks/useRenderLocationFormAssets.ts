import {
    downloadGLTF,
    RenderStateDynamicInstance,
    RenderStateDynamicMesh,
    RenderStateDynamicObject,
    RGBA,
} from "@novorender/api";
import { ReadonlyVec3 } from "gl-matrix";
import { useEffect, useMemo, useRef } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { CameraType, selectCameraType } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { AsyncStatus } from "types/misc";

import { useFormsGlobals } from "../formsGlobals";
import { selectAssets, selectLocationForms, selectSelectedFormId, selectTemplates } from "../slice";
import { FormGLtfAsset } from "../types";

type RenderedForm = {
    id: string;
    symbol: string;
    location: ReadonlyVec3;
};

function areRenderedFormsEqual(a: RenderedForm, b: RenderedForm) {
    return a.id === b.id && a.symbol === b.symbol && a.location === b.location;
}

const MAX_ASSET_COUNT = 100_000;
const SELECTED_OBJECT_ID_OFFSET = MAX_ASSET_COUNT / 2;

export function useRenderLocationFormAssets() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const { setState: setFormsGlobals } = useFormsGlobals();
    const templates = useAppSelector(selectTemplates);
    const locationForms = useAppSelector(selectLocationForms);
    const assetInfoList = useAppSelector(selectAssets);
    const [abortController, abort] = useAbortController();
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const selectedMeshCache = useRef(new WeakMap<RenderStateDynamicMesh, RenderStateDynamicMesh>());
    const active = useAppSelector(selectCameraType) === CameraType.Pinhole;
    const needCleaning = useRef(false);

    const prevRenderedForms = useRef<RenderedForm[]>();
    const renderedForms = useMemo(() => {
        if (!active || templates.status !== AsyncStatus.Success) {
            return [];
        }

        const templateMap = new Map(templates.data.map((t) => [t.id, t]));

        const result = locationForms
            .filter(({ form }) => form.location)
            .map(({ templateId, form }) => {
                const template = templateMap.get(templateId)!;
                return { id: form.id!, symbol: template.symbol!, location: form.location! };
            });

        if (areArraysEqual(result, prevRenderedForms.current, areRenderedFormsEqual)) {
            return prevRenderedForms.current!;
        } else {
            prevRenderedForms.current = result;
            return result;
        }
    }, [templates, locationForms, active]);

    const willUnmount = useRef(false);
    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            abort();
        };
    }, [locationForms, abort]);

    useEffect(() => {
        updateDynamicObjects();

        return () => {
            if (willUnmount.current && needCleaning.current) {
                cleanup();
            }
        };

        function cleanup() {
            if (!view || assetInfoList.status !== AsyncStatus.Success) {
                return;
            }

            const baseObjectIdSet = new Set<number>(assetInfoList.data.map((a) => a.baseObjectId));

            const objects = view.renderState.dynamic.objects.filter(
                (obj) =>
                    !obj.baseObjectId ||
                    (!baseObjectIdSet.has(obj.baseObjectId) &&
                        !baseObjectIdSet.has(obj.baseObjectId + SELECTED_OBJECT_ID_OFFSET))
            );

            needCleaning.current = false;

            view.modifyRenderState({ dynamic: { objects } });
            setFormsGlobals((s) => ({ ...s, objectIdToFormIdMap: new Map() }));
        }

        async function updateDynamicObjects() {
            if (!view || assetInfoList.status !== AsyncStatus.Success) {
                return;
            }

            // Clean and exit
            if (!active) {
                if (needCleaning.current) {
                    cleanup();
                }

                return;
            }

            const uniqueSymbols = new Set<string>();
            for (const form of renderedForms) {
                uniqueSymbols.add(form.symbol);
            }

            const assetMap = new Map<
                string,
                {
                    ref: RenderStateDynamicObject;
                    instances: RenderStateDynamicInstance[];
                    selectedInstances: RenderStateDynamicInstance[];
                }[]
            >();
            await Promise.all(
                [...uniqueSymbols].sort().map(async (name) => {
                    const assetInfo = assetInfoList.data.find((a) => a.name === name)!;
                    assetMap.set(
                        name,
                        (await loadAsset(name, assetInfo, abortController.current)).map((ref) => ({
                            ref,
                            instances: [],
                            selectedInstances: [],
                        }))
                    );
                })
            );

            const objectIdToFormIdMap = new Map<number, string>();

            for (const form of renderedForms) {
                const asset = assetMap.get(form.symbol)!;
                for (const { ref, instances, selectedInstances } of asset) {
                    for (const refInst of ref.instances) {
                        let objectId: number;
                        if (selectedFormId === form.id) {
                            objectId = ref.baseObjectId! + SELECTED_OBJECT_ID_OFFSET + selectedInstances.length;
                            selectedInstances.push({
                                ...refInst,
                                position: form.location,
                                scale: (refInst.scale ?? 1) * 1.2,
                            });
                        } else {
                            objectId = ref.baseObjectId! + instances.length;
                            instances.push({
                                ...refInst,
                                position: form.location,
                            });
                        }

                        objectIdToFormIdMap.set(objectId, form.id);
                    }
                }
            }

            let objects = view.renderState.dynamic.objects as RenderStateDynamicObject[];
            if (needCleaning.current) {
                const baseObjectIdSet = new Set<number>(assetInfoList.data.map((a) => a.baseObjectId));

                objects = view.renderState.dynamic.objects.filter(
                    (obj) =>
                        !obj.baseObjectId ||
                        (!baseObjectIdSet.has(obj.baseObjectId) &&
                            !baseObjectIdSet.has(obj.baseObjectId + SELECTED_OBJECT_ID_OFFSET))
                );

                needCleaning.current = false;
            } else {
                objects = objects.slice();
            }

            assetMap.forEach((assets) => {
                for (const { ref, instances, selectedInstances } of assets) {
                    if (instances.length) {
                        objects.push({
                            ...ref,
                            instances,
                        });
                    }

                    if (selectedInstances.length) {
                        let mesh = selectedMeshCache.current.get(ref.mesh);
                        if (!mesh) {
                            mesh = createSelectedMesh(ref.mesh);
                            selectedMeshCache.current.set(ref.mesh, mesh);
                        }
                        objects.push({
                            mesh,
                            baseObjectId: ref.baseObjectId! + SELECTED_OBJECT_ID_OFFSET,
                            instances: selectedInstances,
                        });
                    }
                }
            });

            needCleaning.current = true;
            view.modifyRenderState({ dynamic: { objects } });
            setFormsGlobals((s) => ({ ...s, objectIdToFormIdMap }));
        }
    }, [renderedForms, view, assetInfoList, abortController, setFormsGlobals, selectedFormId, active]);
}

const HIGHLIGHT_COLOR: RGBA = [1, 0, 0, 1];

function createSelectedMesh(mesh: RenderStateDynamicMesh): RenderStateDynamicMesh {
    mesh = structuredClone(mesh);
    for (const p of mesh.primitives) {
        (p.material.baseColorFactor as RGBA) = HIGHLIGHT_COLOR;
    }

    return mesh;
}

const ASSET_CACHE = new Map<string, readonly RenderStateDynamicObject[]>();
const ASSET_CACHE_PROMISES = new Map<string, Promise<readonly RenderStateDynamicObject[]>>();

async function loadAsset2(name: string, asset: FormGLtfAsset, abortController: AbortController) {
    let loadedGltfList = ASSET_CACHE.get(name);
    if (!loadedGltfList) {
        let promise = ASSET_CACHE_PROMISES.get(name);
        if (!promise) {
            try {
                const url = getAssetGlbUrl(asset.name);
                promise = downloadGLTF(new URL(url), asset.baseObjectId, abortController);
                ASSET_CACHE_PROMISES.set(name, promise);
                loadedGltfList = await promise;
                ASSET_CACHE.set(name, loadedGltfList);
            } finally {
                ASSET_CACHE_PROMISES.delete(name);
            }
        } else {
            loadedGltfList = await promise;
        }
    }
    return loadedGltfList;
}

async function loadAsset(name: string, asset: FormGLtfAsset, abortController: AbortController) {
    let loadedGltfList = ASSET_CACHE.get(name);
    if (!loadedGltfList) {
        const url = getAssetGlbUrl(asset.name);
        loadedGltfList = await downloadGLTF(new URL(url), asset.baseObjectId, abortController);
        ASSET_CACHE.set(name, loadedGltfList);
    }
    return loadedGltfList;
}

function getAssetGlbUrl(asset: string) {
    return `https://novorenderblobs.blob.core.windows.net/assets/glbs/${asset}.glb`;
}
