import { IQueryFeaturesResponse } from "@esri/arcgis-rest-feature-service";
import { request } from "@esri/arcgis-rest-request";
import { useGetProjectInfoQuery } from "apis/dataV2/dataV2Api";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";

import {
    arcgisActions,
    FeatureServer,
    Layer,
    LayerDetails,
    LayerFeatures,
    selectArcgisFeatureServers,
} from "../arcgisSlice";
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
        loadLayer();

        async function loadLayer() {
            if (!epsg || featureServers.status !== AsyncStatus.Success) {
                return;
            }

            abortNoLongerRelevantLoaders(abortControllers.current, featureServers.data);

            const layersToLoad = featureServers.data.flatMap((featureServer) =>
                featureServer.layers
                    .filter(
                        (layer) =>
                            layer.checked &&
                            (layer.details.status === AsyncStatus.Initial ||
                                layer.features.status === AsyncStatus.Initial)
                    )
                    .map((layer) => ({ featureServer, layer }))
            );

            if (layersToLoad.length === 0) {
                return;
            }

            dispatch(
                arcgisActions.updateMultipleLayers(
                    layersToLoad.map(({ featureServer, layer }) => ({
                        featureServerId: featureServer.id,
                        layerId: layer.id,
                        details:
                            layer.details.status === AsyncStatus.Initial ? { status: AsyncStatus.Loading } : undefined,
                        features:
                            layer.features.status === AsyncStatus.Initial ? { status: AsyncStatus.Loading } : undefined,
                    }))
                )
            );

            const promises: Promise<unknown>[] = [];
            for (const { featureServer, layer } of layersToLoad) {
                if (layer.features.status === AsyncStatus.Initial) {
                    promises.push(loadFeatures(dispatch, abortControllers.current, epsg, featureServer, layer));
                }

                if (layer.details.status === AsyncStatus.Initial) {
                    promises.push(loadDetails(dispatch, abortControllers.current, featureServer, layer));
                }
            }

            // Actually no need to await, because responses are dispatched for every request as they arrive
            await Promise.all(promises);
        }
    }, [featureServers, dispatch, epsg]);
}

async function loadFeatures(
    dispatch: ReturnType<typeof useAppDispatch>,
    abortControllers: LayerAbortController[],
    epsg: string,
    featureServer: FeatureServer,
    layer: Layer
) {
    const abortController = new AbortController();
    const abortEntry: LayerAbortController = {
        featureServerId: featureServer.id,
        layerId: layer.id,
        abortController,
    };
    abortControllers.push(abortEntry);

    // Using request instead of queryFeatures because queryFeatures doesn't
    // seem to support signal
    const features = await request(`${featureServer.url}/${layer.id}/query`, {
        params: {
            outSR: epsg,
            where: makeWhereStatement(featureServer, layer) || "1=1",
            outFields: "*",
        },
        signal: abortController.signal,
    })
        .then((resp) => {
            const { features } = resp as IQueryFeaturesResponse;
            return {
                status: AsyncStatus.Success,
                data: { features },
            } as AsyncState<LayerFeatures>;
        })
        .catch((error) => {
            if (error.name === "AbortError") {
                return { status: AsyncStatus.Initial } as AsyncState<LayerFeatures>;
            }

            console.warn(error);
            return {
                status: AsyncStatus.Error,
                msg: "Error loading layer features",
            } as AsyncState<LayerFeatures>;
        })
        .finally(() => {
            const index = abortControllers.indexOf(abortEntry);
            if (index !== -1) {
                abortControllers.splice(index, 1);
            }
        });

    dispatch(
        arcgisActions.updateMultipleLayers([
            {
                featureServerId: featureServer.id,
                layerId: layer.id,
                features,
            },
        ])
    );
}

async function loadDetails(
    dispatch: ReturnType<typeof useAppDispatch>,
    abortControllers: LayerAbortController[],
    featureServer: FeatureServer,
    layer: Layer
) {
    const abortController = new AbortController();
    const abortEntry: LayerAbortController = {
        featureServerId: featureServer.id,
        layerId: layer.id,
        abortController,
    };
    abortControllers.push(abortEntry);

    // Using request instead of queryFeatures because queryFeatures doesn't
    // seem to support signal
    const details = await request(`${featureServer.url}/${layer.id}`, {
        signal: abortController.signal,
    })
        .then((resp) => {
            const { fields, drawingInfo } = resp;
            return {
                status: AsyncStatus.Success,
                data: { fields, drawingInfo },
            } as AsyncState<LayerDetails>;
        })
        .catch((error) => {
            if (error.name === "AbortError") {
                return { status: AsyncStatus.Initial } as AsyncState<LayerDetails>;
            }

            console.warn(error);
            return {
                status: AsyncStatus.Error,
                msg: "Error loading layer details",
            } as AsyncState<LayerDetails>;
        })
        .finally(() => {
            const index = abortControllers.indexOf(abortEntry);
            if (index !== -1) {
                abortControllers.splice(index, 1);
            }
        });

    dispatch(
        arcgisActions.updateMultipleLayers([
            {
                featureServerId: featureServer.id,
                layerId: layer.id,
                details,
            },
        ])
    );
}

// Abort loaders for removed feature servers and unchecked layers
// Loaders for aborted layers are set to AsyncStatus.Initial status
function abortNoLongerRelevantLoaders(abortControllers: LayerAbortController[], featureServers: FeatureServer[]) {
    abortControllers.forEach(({ featureServerId, layerId, abortController }, index) => {
        const featureServer = featureServers.find((fs) => fs.id === featureServerId);
        if (featureServer) {
            const layer = featureServer.layers.find((l) => l.id === layerId);
            if (layer && layer.checked) {
                return;
            }
        }

        abortController.abort();
        abortControllers.splice(index, 1);
    });
}
