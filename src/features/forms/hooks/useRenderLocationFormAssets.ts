import { RenderStateDynamicInstance, RenderStateDynamicMesh, RenderStateDynamicObject, RGBA } from "@novorender/api";
import { ReadonlyVec3 } from "gl-matrix";
import { useEffect, useMemo, useRef } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { useAbortController } from "hooks/useAbortController";
import { AsyncStatus } from "types/misc";

import { useFormsGlobals } from "../formsGlobals";
import { selectAssets, selectLocationForms, selectSelectedFormId, selectTemplates } from "../slice";
import { useLoadAsset } from "./useLoadAsset";

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
    const currentForms = useAppSelector(selectLocationForms);
    const assetInfoList = useAppSelector(selectAssets);
    const loadAsset = useLoadAsset();
    const [abortController] = useAbortController();
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const selectedMeshCache = useRef(new WeakMap<RenderStateDynamicMesh, RenderStateDynamicMesh>());

    const templateMap = useMemo(() => {
        if (templates.status === AsyncStatus.Success) {
            return new Map(templates.data.map((t) => [t.id, t]));
        }
    }, [templates]);

    const prevUniqueSymbols = useRef<string[]>();
    const uniqueSymbols = useMemo(() => {
        const result =
            templates.status === AsyncStatus.Success
                ? [...new Set(templates.data.filter((t) => t.symbol).map((t) => t.symbol!))].sort()
                : [];

        if (areArraysEqual(result, prevUniqueSymbols.current)) {
            return prevUniqueSymbols.current!;
        } else {
            prevUniqueSymbols.current = result;
            return result;
        }
    }, [templates]);

    const prevRenderedForms = useRef<RenderedForm[]>();
    const renderedForms = useMemo(() => {
        if (!templateMap) {
            return [];
        }

        const result = currentForms
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
    }, [templateMap, currentForms]);

    useEffect(() => {
        updateDynamicObjects();

        async function updateDynamicObjects() {
            if (!loadAsset || !view || assetInfoList.status !== AsyncStatus.Success) {
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
            await Promise.all(
                uniqueSymbols.map(async (s) => {
                    assetMap.set(
                        s,
                        (await loadAsset(s)).map((ref) => ({ ref, instances: [], selectedInstances: [] }))
                    );
                })
            );

            if (abortController.current.signal.aborted) {
                return;
            }

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

            const baseObjectIdSet = new Set<number>(assetInfoList.data.map((a) => a.baseObjectId));

            const objects = view.renderState.dynamic.objects.filter(
                (obj) =>
                    !obj.baseObjectId ||
                    (!baseObjectIdSet.has(obj.baseObjectId) &&
                        !baseObjectIdSet.has(obj.baseObjectId + SELECTED_OBJECT_ID_OFFSET))
            );
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

            view.modifyRenderState({ dynamic: { objects } });
            setFormsGlobals((s) => ({ ...s, objectIdToFormIdMap }));
        }
    }, [
        renderedForms,
        view,
        assetInfoList,
        loadAsset,
        uniqueSymbols,
        abortController,
        setFormsGlobals,
        selectedFormId,
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
