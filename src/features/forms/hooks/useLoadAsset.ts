import { downloadGLTF, RenderStateDynamicObject } from "@novorender/api";
import { useCallback, useMemo } from "react";

import { useAppSelector } from "app/store";
import { useAbortController } from "hooks/useAbortController";
import { AsyncStatus } from "types/misc";

import { selectAssets } from "../slice";
import { useFetchAssetList } from "./useFetchAssetList";

const ASSET_CACHE = new Map<string, readonly RenderStateDynamicObject[]>();
const ASSET_CACHE_PROMISES = new Map<string, Promise<readonly RenderStateDynamicObject[]>>();

export function useLoadAsset() {
    useFetchAssetList();
    const assets = useAppSelector(selectAssets);
    const [abortController] = useAbortController();

    const assetMap = useMemo(() => {
        if (assets.status === AsyncStatus.Success) {
            return new Map(assets.data.map((a) => [a.name, a]));
        }
    }, [assets]);

    const callback = useCallback(
        async (name: string) => {
            let loadedGltfList = ASSET_CACHE.get(name);
            if (!loadedGltfList) {
                let promise = ASSET_CACHE_PROMISES.get(name);
                if (!promise) {
                    try {
                        const asset = assetMap!.get(name)!;
                        const url = getAssetGlbUrl(asset.name);
                        promise = downloadGLTF(new URL(url), asset.baseObjectId, abortController.current);
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
        },
        [assetMap, abortController]
    );

    return assetMap ? callback : undefined;
}

function getAssetGlbUrl(asset: string) {
    return `https://novorenderblobs.blob.core.windows.net/assets/glbs/${asset}.glb`;
}
