import { request } from "@esri/arcgis-rest-request";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useAbortController } from "hooks/useAbortController";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";
import { FeatureServerResp } from "../arcgisTypes";

export function useLoadFeatureServerMeta() {
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();

    const [abortController] = useAbortController();

    useEffect(() => {
        fetchMeta();

        async function fetchMeta() {
            if (featureServers.status !== AsyncStatus.Success) {
                return;
            }

            await Promise.all(
                featureServers.data
                    .filter((fs) => fs.meta.status === AsyncStatus.Initial)
                    .map(async (fs) => {
                        dispatch(
                            arcgisActions.setFeatureServerMeta({
                                id: fs.config.id,
                                meta: { status: AsyncStatus.Loading },
                            })
                        );

                        let meta: AsyncState<FeatureServerResp>;
                        try {
                            const data = (await request(fs.config.url, {
                                signal: abortController.current.signal,
                            })) as FeatureServerResp;

                            // We only handle feature layers at the moment
                            data.layers = data.layers.filter((l) => l.type === "Feature Layer");

                            if (fs.config.enabledLayerIds?.length) {
                                data.layers = data.layers.filter((l) => fs.config.enabledLayerIds?.includes(l.id));
                            }

                            meta = { status: AsyncStatus.Success, data };
                        } catch (ex) {
                            console.warn(ex);
                            meta = { status: AsyncStatus.Error, msg: "Error loading feature server metadata" };
                        }

                        dispatch(arcgisActions.setFeatureServerMeta({ id: fs.config.id, meta: meta }));
                    })
            );
        }
    }, [featureServers, abortController, dispatch]);
}
