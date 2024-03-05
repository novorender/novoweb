import { useEffect, useState } from "react";

import { AsyncState, AsyncStatus } from "types/misc";

export interface GLtfAsset {
    name: string;
}

export function useFetchAssetList() {
    const [assets, setAssets] = useState<AsyncState<string[]>>({
        status: AsyncStatus.Initial,
    });

    useEffect(() => {
        getAssets();

        async function getAssets() {
            setAssets({ status: AsyncStatus.Loading });
            const response = await fetch(
                new URL("https://novorenderblobs.blob.core.windows.net/assets/glbs/assets.json")
            );
            const json = await response.json();
            const assetList = json as GLtfAsset[];
            const assets = assetList.map((asset) => asset.name);
            setAssets({ status: AsyncStatus.Success, data: assets });
        }
    }, []);

    return assets;
}
