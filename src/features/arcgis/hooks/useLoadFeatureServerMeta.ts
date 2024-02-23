import { request } from "@esri/arcgis-rest-request";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useAbortController } from "hooks/useAbortController";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, FeatureServerMeta, selectArcgisFeatureServers, selectArcgisWidgetConfig } from "../arcgisSlice";

export function useLoadFeatureServerMeta() {
    const featureServerConfigs = useAppSelector(selectArcgisWidgetConfig);
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();

    const [abortController] = useAbortController();

    useEffect(() => {
        fetchMeta();

        async function fetchMeta() {
            if (featureServerConfigs.status !== AsyncStatus.Success) {
                return;
            }

            await Promise.all(
                featureServers
                    .filter((fs) => fs.meta.status === AsyncStatus.Initial)
                    .map(async (fs) => {
                        const fsConfig = featureServerConfigs.data.featureServers.find((e) => e.url === fs.url)!;

                        dispatch(
                            arcgisActions.setFeatureServerMeta({ url: fs.url, meta: { status: AsyncStatus.Loading } })
                        );

                        let meta: AsyncState<FeatureServerMeta>;
                        try {
                            const data = (await request(fs.url, {
                                signal: abortController.current.signal,
                            })) as FeatureServerMeta;

                            // We only handle feature layers at the moment
                            data.layers = data.layers.filter((l) => l.type === "Feature Layer");

                            if (fsConfig.enabledLayerIds?.length) {
                                data.layers = data.layers.filter((l) => fsConfig.enabledLayerIds?.includes(l.id));
                            }

                            meta = { status: AsyncStatus.Success, data };
                        } catch (ex) {
                            console.warn(ex);
                            meta = { status: AsyncStatus.Error, msg: "Error loading feature server metadata" };
                        }

                        dispatch(arcgisActions.setFeatureServerMeta({ url: fs.url, meta: meta }));
                    })
            );
        }
    }, [featureServerConfigs, featureServers, abortController, dispatch]);
}
