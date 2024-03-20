import { IQueryFeaturesResponse } from "@esri/arcgis-rest-feature-service";
import { IFeature, request } from "@esri/arcgis-rest-request";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";
import { FeatureServer, Layer, LayerDefinition } from "../types";
import { makeWhereStatement } from "../utils";
import { useProjectEpsg } from "./useProjectEpsg";

type LayerAbortController = {
    featureServerId: string;
    layerId: number;
    abortController: AbortController;
};

export function useLoadFeaturesAndDefinition() {
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();
    const abortControllers = useRef([] as LayerAbortController[]);
    const { data: epsg } = useProjectEpsg({ skip: featureServers.status !== AsyncStatus.Success });

    useEffect(() => {
        const { current } = abortControllers;
        return () => {
            for (const { abortController } of current) {
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
                            (layer.definition.status === AsyncStatus.Initial ||
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
                        definition:
                            layer.definition.status === AsyncStatus.Initial
                                ? { status: AsyncStatus.Loading }
                                : undefined,
                        features:
                            layer.definition.status === AsyncStatus.Success &&
                            layer.features.status === AsyncStatus.Initial
                                ? { status: AsyncStatus.Loading }
                                : undefined,
                    }))
                )
            );

            const promises: Promise<unknown>[] = [];
            for (const { featureServer, layer } of layersToLoad) {
                if (layer.definition.status === AsyncStatus.Initial) {
                    promises.push(loadDefinition(dispatch, abortControllers.current, featureServer, layer));
                }

                if (layer.definition.status === AsyncStatus.Success && layer.features.status === AsyncStatus.Initial) {
                    promises.push(
                        loadFeatures(
                            dispatch,
                            abortControllers.current,
                            layer.definition.data,
                            epsg,
                            featureServer,
                            layer
                        )
                    );
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
    definition: LayerDefinition,
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
    const fields = ["OBJECTID"];
    if (definition.drawingInfo.renderer.type === "uniqueValue") {
        fields.push(definition.drawingInfo.renderer.field1);
    }

    const features = await request(`${featureServer.url}/${layer.id}/query`, {
        params: {
            outSR: epsg,
            where: makeWhereStatement(featureServer, layer) || "1=1",
            outFields: fields.join(","),
        },
        signal: abortController.signal,
    })
        .then((resp) => {
            const { features } = resp as IQueryFeaturesResponse;
            return {
                status: AsyncStatus.Success,
                data: features,
            } as AsyncState<IFeature[]>;
        })
        .catch((error) => {
            if (error.name === "AbortError") {
                return { status: AsyncStatus.Initial } as AsyncState<IFeature[]>;
            }

            console.warn(error);
            return {
                status: AsyncStatus.Error,
                msg: "Error loading layer features",
            } as AsyncState<IFeature[]>;
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

async function loadDefinition(
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
    const definition = await request(`${featureServer.url}/${layer.id}`, {
        signal: abortController.signal,
    })
        .then((data) => {
            return {
                status: AsyncStatus.Success,
                data,
            } as AsyncState<LayerDefinition>;
        })
        .catch((error) => {
            if (error.name === "AbortError") {
                return { status: AsyncStatus.Initial } as AsyncState<LayerDefinition>;
            }

            console.warn(error);
            return {
                status: AsyncStatus.Error,
                msg: "Error loading layer definition",
            } as AsyncState<LayerDefinition>;
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
                definition: definition,
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
