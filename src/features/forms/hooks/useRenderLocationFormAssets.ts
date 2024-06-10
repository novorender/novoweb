import {
    downloadGLTF,
    RenderStateDynamicInstance,
    RenderStateDynamicMesh,
    RenderStateDynamicObject,
    RGBA,
} from "@novorender/api";
import { ReadonlyQuat, ReadonlyVec3 } from "gl-matrix";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { CameraType, selectCameraType } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { selectConfig } from "slices/explorer";
import { AsyncState, AsyncStatus } from "types/misc";

import { formsGlobalsActions } from "../formsGlobals";
import { useDispatchFormsGlobals, useFormsGlobals } from "../formsGlobals/hooks";
import {
    selectAssets,
    selectCurrentFormsList,
    selectLocationForms,
    selectSelectedFormId,
    selectTemplates,
} from "../slice";
import { FormGLtfAsset, LocationTemplate } from "../types";
import { useFetchAssetList } from "./useFetchAssetList";

type RenderedForm = {
    templateId: string;
    id: string;
    marker: string;
    location: ReadonlyVec3;
    rotation?: ReadonlyQuat;
    scale?: number;
};

function areRenderedFormsEqual(a: RenderedForm, b: RenderedForm) {
    return (
        a.templateId === b.templateId &&
        a.id === b.id &&
        a.marker === b.marker &&
        a.location === b.location &&
        a.rotation === b.rotation &&
        a.scale === b.scale
    );
}

const MAX_ASSET_COUNT = 100_000;
const SELECTED_OBJECT_ID_OFFSET = MAX_ASSET_COUNT / 2;

function useTransformDraft() {
    const formsGlobals = useFormsGlobals();
    return useMemo(() => formsGlobals.transformDraft, [formsGlobals]);
}

export function useRenderLocationFormAssets() {
    useFetchAssetList();

    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const transform = useTransformDraft();
    const templates = useAppSelector(selectTemplates);
    const locationForms = useAppSelector(selectLocationForms);
    const assetInfoList = useAppSelector(selectAssets);
    const [abortController, abort] = useAbortController();
    const selectedTemplateId = useAppSelector(selectCurrentFormsList);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const selectedMeshCache = useRef(new WeakMap<RenderStateDynamicMesh, RenderStateDynamicMesh>());
    const active = useAppSelector(selectCameraType) === CameraType.Pinhole;
    const assetsUrl = useAppSelector(selectConfig).assetsUrl;

    const [assetAbortController, assetAbort] = useAbortController();
    const [assetGltfMap, setAssetGltfMap] = useState<AsyncState<Map<string, readonly RenderStateDynamicObject[]>>>({
        status: AsyncStatus.Initial,
    });
    const needCleaning = useRef(false);

    const prevRenderedForms = useRef<RenderedForm[]>();
    const renderedForms = useMemo(() => {
        if (!active || templates.status !== AsyncStatus.Success) {
            return [];
        }

        const templateMap = new Map(templates.data.map((t) => [t.id, t]));

        const result = locationForms
            .filter((form) => form.location)
            .map((form) => {
                const template = templateMap.get(form.templateId)! as LocationTemplate;
                const result = {
                    templateId: template.id,
                    id: form.id,
                    marker: template.marker,
                    location: form.location!,
                    rotation: form.rotation,
                    scale: form.scale,
                };

                if (form.templateId === selectedTemplateId && form.id === selectedFormId && transform) {
                    result.location = transform.location!;
                    result.rotation = transform.rotation!;
                    result.scale = transform.scale!;
                }
                return result;
            });

        if (areArraysEqual(result, prevRenderedForms.current, areRenderedFormsEqual)) {
            return prevRenderedForms.current!;
        } else {
            prevRenderedForms.current = result;
            return result;
        }
    }, [templates, locationForms, active, transform, selectedTemplateId, selectedFormId]);

    const uniqueMarkers = useMemo(() => {
        const uniqueMarkers = new Set<string>();
        for (const form of renderedForms) {
            uniqueMarkers.add(form.marker);
        }

        return uniqueMarkers;
    }, [renderedForms]);

    useEffect(() => {
        setAssetGltfMap({ status: AsyncStatus.Initial });
        assetAbort();
        loadAssets();

        async function loadAssets() {
            if (assetInfoList.status !== AsyncStatus.Success) {
                return;
            }

            const result = new Map<string, readonly RenderStateDynamicObject[]>();

            try {
                await Promise.all(
                    [...uniqueMarkers].sort().map(async (name) => {
                        const assetInfo = assetInfoList.data.find((a) => a.name === name)!;
                        result.set(name, await loadAsset(assetsUrl, name, assetInfo, assetAbortController.current));
                    })
                );
            } catch (e) {
                setAssetGltfMap({ status: AsyncStatus.Error, msg: "Error loading assets" });
            }

            setAssetGltfMap({ status: AsyncStatus.Success, data: result });
        }
    }, [uniqueMarkers, assetInfoList, assetAbort, assetAbortController, assetsUrl]);

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
            if (!view || assetInfoList.status !== AsyncStatus.Success || assetGltfMap.status !== AsyncStatus.Success) {
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
            dispatchFormsGlobals(formsGlobalsActions.setObjectIdToFormIdMap(new Map()));
        }

        function updateDynamicObjects() {
            if (!view || assetInfoList.status !== AsyncStatus.Success || assetGltfMap.status !== AsyncStatus.Success) {
                return;
            }

            // Clean and exit
            if (!active) {
                if (needCleaning.current) {
                    cleanup();
                }

                return;
            }

            const assetMap = new Map<
                string,
                {
                    ref: RenderStateDynamicObject;
                    instances: RenderStateDynamicInstance[];
                    selectedInstances: RenderStateDynamicInstance[];
                }[]
            >();
            assetGltfMap.data.forEach((asset, name) => {
                assetMap.set(
                    name,
                    asset.map((ref) => ({
                        ref,
                        instances: [],
                        selectedInstances: [],
                    }))
                );
            });

            const objectIdToFormIdMap = new Map<number, { templateId: string; formId: string }>();

            for (const form of renderedForms) {
                const asset = assetMap.get(form.marker)!;
                if (!asset) {
                    continue;
                }

                for (const { ref, instances, selectedInstances } of asset) {
                    for (const refInst of ref.instances) {
                        let objectId: number;
                        const position = form.location;
                        const rotation = form.rotation;
                        const scale = (refInst.scale ?? 1) * (form.scale ?? 1);

                        if (selectedTemplateId === form.templateId && selectedFormId === form.id) {
                            objectId = ref.baseObjectId! + SELECTED_OBJECT_ID_OFFSET + selectedInstances.length;
                            selectedInstances.push({
                                ...refInst,
                                position,
                                rotation,
                                scale: scale * 1.2,
                            });
                        } else {
                            objectId = ref.baseObjectId! + instances.length;
                            instances.push({
                                ...refInst,
                                position,
                                rotation,
                                scale,
                            });
                        }

                        objectIdToFormIdMap.set(objectId, { templateId: form.templateId, formId: form.id });
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
            dispatchFormsGlobals(formsGlobalsActions.setObjectIdToFormIdMap(objectIdToFormIdMap));
        }
    }, [
        renderedForms,
        view,
        assetInfoList,
        abortController,
        selectedTemplateId,
        selectedFormId,
        active,
        assetGltfMap,
        dispatchFormsGlobals,
    ]);
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

async function loadAsset(assetsUrl: string, name: string, asset: FormGLtfAsset, abortController: AbortController) {
    let loadedGltfList = ASSET_CACHE.get(name);
    if (!loadedGltfList) {
        const url = getAssetGlbUrl(assetsUrl, asset.name);
        loadedGltfList = await downloadGLTF(new URL(url), asset.baseObjectId, abortController);
        ASSET_CACHE.set(name, loadedGltfList);
    }
    return loadedGltfList;
}

function getAssetGlbUrl(assetsUrl: string, asset: string) {
    return `${assetsUrl}/glbs/${asset}.glb`;
}
