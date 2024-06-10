import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectConfig } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { formsActions, selectAssets } from "../slice";
import { FormGLtfAsset } from "../types";

export function useFetchAssetList() {
    const assets = useAppSelector(selectAssets);
    const dispatch = useAppDispatch();
    const assetsUrl = useAppSelector(selectConfig).assetsUrl;

    useEffect(() => {
        getAssets();

        async function getAssets() {
            if (assets.status !== AsyncStatus.Initial) {
                return;
            }

            dispatch(formsActions.setAssets({ status: AsyncStatus.Loading }));
            const response = await fetch(new URL(`${assetsUrl}/glbs/assets.json`));
            const json = await response.json();
            const data: FormGLtfAsset[] = (json as FormGLtfAsset[]).map((item, i) => ({
                ...item,
                baseObjectId: 0xf000_0000 + 100_000 * i,
            }));
            dispatch(formsActions.setAssets({ status: AsyncStatus.Success, data }));
        }
    }, [dispatch, assets, assetsUrl]);

    return assets;
}
