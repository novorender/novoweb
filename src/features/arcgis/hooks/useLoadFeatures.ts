import { IQueryFeaturesResponse } from "@esri/arcgis-rest-feature-service";
import { request } from "@esri/arcgis-rest-request";
import { useGetProjectInfoQuery } from "apis/dataV2/dataV2Api";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, FeatureLayerDetailsResp, FeatureServerState, selectArcgisFeatureServers } from "../arcgisSlice";
import { makeWhereStatement } from "../utils";

type LayerAbortController = {
    featureServerId: string;
    layerId: number;
    abortController: AbortController;
};

export function useLoadFeatures() {
    const projectId = useExplorerGlobals(true).state.scene.id;
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();
    const abortControllers = useRef([] as LayerAbortController[]);
    const { data: projectInfo } = useGetProjectInfoQuery({ projectId });
    const epsg = projectInfo?.epsg;

    useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            for (const { abortController } of abortControllers.current) {
                abortController.abort();
            }
        };
    }, []);

    useEffect(() => {
        loadFeatures();

        async function loadFeatures() {
            if (!epsg || featureServers.status !== AsyncStatus.Success) {
                return;
            }

            abortNoLongerRelevantLoaders(dispatch, abortControllers.current, featureServers.data);

            const layersToLoad = featureServers.data.flatMap((featureServer) =>
                featureServer.layers
                    .filter((layer) => layer.checked && layer.details.status === AsyncStatus.Initial)
                    .map((layer) => ({ featureServer, layer }))
            );

            if (layersToLoad.length === 0) {
                return;
            }

            dispatch(
                arcgisActions.setMultipleLayerDetails(
                    layersToLoad.map(({ featureServer, layer }) => ({
                        featureServerId: featureServer.config.id,
                        layerId: layer.meta.id,
                        details: { status: AsyncStatus.Loading },
                    }))
                )
            );

            // Actually no need to await, because responses are dispatched for every request as they arrive
            await Promise.all(
                layersToLoad.map(async ({ featureServer, layer }) => {
                    const abortController = new AbortController();
                    abortControllers.current.push({
                        featureServerId: featureServer.config.id,
                        layerId: layer.meta.id,
                        abortController,
                    });

                    // Using request instead of queryFeatures because queryFeatures doesn't
                    // seem to support signal
                    const details = await request(`${featureServer.config.url}/${layer.meta.id}/query`, {
                        params: {
                            outSR: epsg,
                            where: makeWhereStatement(featureServer.config, layer) || "1=1",
                            outFields: "*",
                        },
                        signal: abortController.signal,
                    })
                        .then((resp) => {
                            const { features, fields } = resp as IQueryFeaturesResponse;
                            return {
                                status: AsyncStatus.Success,
                                data: { features, fields },
                            } as AsyncState<FeatureLayerDetailsResp>;
                        })
                        .catch((error) => {
                            if (error.name === "AbortError") {
                                return { status: AsyncStatus.Initial } as AsyncState<FeatureLayerDetailsResp>;
                            }

                            console.warn(error);
                            return {
                                status: AsyncStatus.Error,
                                msg: "Error loading layer features",
                            } as AsyncState<FeatureLayerDetailsResp>;
                        })
                        .finally(() => {
                            const index = abortControllers.current.findIndex(
                                (a) => a.featureServerId === featureServer.config.id && a.layerId === layer.meta.id
                            );
                            if (index !== -1) {
                                abortControllers.current.splice(index, 1);
                            }
                        });

                    dispatch(
                        arcgisActions.setMultipleLayerDetails([
                            {
                                featureServerId: featureServer.config.id,
                                layerId: layer.meta.id,
                                details,
                            },
                        ])
                    );
                })
            );
        }
    }, [featureServers, dispatch, epsg]);
}

// Abort loaders for removed feature servers and unchecked layers
// Loaders for aborted layers are set to AsyncStatus.Initial status
function abortNoLongerRelevantLoaders(
    dispatch: ReturnType<typeof useAppDispatch>,
    abortControllers: LayerAbortController[],
    featureServers: FeatureServerState[]
) {
    const layersToSetToInit: {
        featureServerId: string;
        layerId: number;
        details: AsyncState<FeatureLayerDetailsResp>;
    }[] = [];

    abortControllers.forEach(({ featureServerId, layerId, abortController }, index) => {
        const featureServer = featureServers.find((fs) => fs.config.id === featureServerId);
        if (featureServer) {
            const layer = featureServer.layers.find((l) => l.meta.id === layerId);
            if (layer) {
                if (layer.details.status === AsyncStatus.Loading && layer.checked) {
                    return;
                }

                layersToSetToInit.push({
                    featureServerId: featureServer.config.id,
                    layerId: layer?.meta.id,
                    details: { status: AsyncStatus.Initial },
                });
            }
        }

        abortController.abort();
        abortControllers.splice(index, 1);
    });

    if (layersToSetToInit.length > 0) {
        dispatch(arcgisActions.setMultipleLayerDetails(layersToSetToInit));
    }
}
