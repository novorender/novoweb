import { IFeature } from "@esri/arcgis-rest-request";
import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { FeatureServerResp, LayerDrawingInfo } from "./arcgisTypes";
import { areArraysEqual, computeFeatureAabb, getTotalAabb2 } from "./utils";

const initialState = {
    featureServers: { status: AsyncStatus.Initial } as AsyncState<FeatureServerState[]>,
    saveStatus: AsyncStatus.Initial,
    selectedFeature: undefined as SelectedFeatureId | undefined,
};

type State = typeof initialState;

// Stored configuration
export type ArcgisWidgetConfig = {
    featureServers: FeatureServerConfig[];
};

export type FeatureServerConfig = {
    id: string;
    url: string;
    name: string;
    layers: { [layerId: number]: LayerConfig }; // This info is copied to layers in runtime
    layerWhere?: string;
    enabledLayerIds?: number[];
};

export type LayerConfig = {
    checked?: boolean;
    where?: string;
};

// App state
export type FeatureServerState = {
    config: FeatureServerConfig;
    meta: AsyncState<FeatureServerResp>;
    layers: Layer[];
};

export type Layer = {
    id: number;
    name: string;
    checked: boolean;
    where?: string;
    aabb?: AABB2;
    details: AsyncState<LayerDetails>;
    features: AsyncState<LayerFeatures>;
};

export type LayerDetails = {
    fields: LayerField[];
    drawingInfo: LayerDrawingInfo;
    objectIdField: string;
};

export type LayerField = {
    name: string;
};

export type LayerFeatures = {
    features: IFeature[];
    featuresAabb: (AABB2 | undefined)[];
};

export type SelectedFeatureId = {
    featureServerId: string;
    layerId: number;
    featureIndex: number;
};

export type SelectedFeatureInfo = {
    attributes: object;
    featureServerConfig: FeatureServerConfig;
    layer: Layer;
};

export const arcgisSlice = createSlice({
    name: "arcgis",
    initialState: initialState,
    reducers: {
        setConfig: (state, action: PayloadAction<AsyncState<FeatureServerState[]>>) => {
            state.featureServers = action.payload;
        },
        setFeatureServerMeta: (state, action: PayloadAction<{ id: string; meta: AsyncState<FeatureServerResp> }>) => {
            if (state.featureServers.status !== AsyncStatus.Success) {
                return;
            }
            const { id, meta } = action.payload;
            const featureServer = state.featureServers.data.find((fs) => fs.config.id === id)!;
            featureServer.meta = meta;

            switch (meta.status) {
                case AsyncStatus.Success: {
                    featureServer.layers = meta.data.layers.map((l) => {
                        const layerConfig = featureServer.config.layers && featureServer.config.layers[l.id];
                        return {
                            id: l.id,
                            name: l.name,
                            checked: layerConfig?.checked ?? false,
                            where: layerConfig?.where,
                            details: { status: AsyncStatus.Initial },
                            features: { status: AsyncStatus.Initial },
                            aabb: undefined,
                        } as Layer;
                    });
                    break;
                }
                case AsyncStatus.Error:
                case AsyncStatus.Initial:
                    featureServer.layers = [];
                    break;
            }
        },
        updateMultipleLayers: (
            state,
            action: PayloadAction<
                {
                    featureServerId: string;
                    layerId: number;
                    details?: AsyncState<LayerDetails>;
                    features?: AsyncState<LayerFeatures>;
                }[]
            >
        ) => {
            for (const { featureServerId, layerId, details, features } of action.payload) {
                const featureServer = findFeatureServer(state, featureServerId)!;
                const layer = featureServer.layers.find((l) => l.id === layerId)!;

                if (details) {
                    layer.details = details;
                }

                if (features) {
                    if (features.status === AsyncStatus.Success) {
                        const data: LayerFeatures = {
                            features: features.data.features,
                            featuresAabb: features.data.features.map(computeFeatureAabb),
                        };
                        layer.features = { status: AsyncStatus.Success, data };
                        const nonEmptyAabbs = data.featuresAabb.filter((e) => e) as AABB2[];
                        layer.aabb = nonEmptyAabbs.length > 0 ? getTotalAabb2(nonEmptyAabbs) : undefined;
                    } else {
                        layer.features = features;
                    }
                }
            }
        },
        checkFeature: (state, action: PayloadAction<{ featureServerId: string; checked: boolean }>) => {
            const { featureServerId, checked } = action.payload;
            const featureServer = findFeatureServer(state, featureServerId)!;
            if (featureServer.meta.status !== AsyncStatus.Success) {
                return;
            }

            for (const layer of featureServer.layers) {
                checkLayer(layer, checked);
            }

            const selected = state.selectedFeature;
            if (!checked && selected && selected.featureServerId === featureServerId) {
                state.selectedFeature = undefined;
            }
        },
        checkFeatureLayer: (
            state,
            action: PayloadAction<{ featureServerId: string; layerId: number; checked: boolean }>
        ) => {
            const { featureServerId, layerId, checked } = action.payload;
            const featureServer = findFeatureServer(state, featureServerId)!;
            const layer = featureServer.layers.find((l) => l.id === layerId)!;

            checkLayer(layer, checked);

            const selected = state.selectedFeature;
            if (!checked && selected && selected.featureServerId === featureServerId && selected.layerId === layerId) {
                state.selectedFeature = undefined;
            }
        },
        removeFeatureServer: (state, action: PayloadAction<{ id: string }>) => {
            if (state.featureServers.status !== AsyncStatus.Success) {
                return;
            }

            const { id } = action.payload;
            state.featureServers.data = state.featureServers.data.filter((e) => e.config.id !== id);

            if (state.selectedFeature?.featureServerId === id) {
                state.selectedFeature = undefined;
            }
        },
        addFeatureServerConfig: (state, action: PayloadAction<FeatureServerConfig>) => {
            const config = action.payload;
            if (state.featureServers.status !== AsyncStatus.Success) {
                return;
            }

            state.featureServers.data.push({
                config,
                meta: { status: AsyncStatus.Initial },
                layers: [],
            });
        },
        updateFeatureServerConfig: (state, action: PayloadAction<FeatureServerConfig>) => {
            const next = action.payload;

            const fs = findFeatureServer(state, next.id)!;

            if (fs.config.url !== next.url || !areArraysEqual(fs.config.enabledLayerIds, next.enabledLayerIds)) {
                fs.config.url = next.url;
                fs.meta = { status: AsyncStatus.Initial };
                fs.layers = [];
            }

            if (fs.config.layerWhere != next.layerWhere) {
                fs.config.layerWhere = next.layerWhere;
                for (const layer of fs.layers) {
                    layer.details = { status: AsyncStatus.Initial };
                }
            }

            fs.config.enabledLayerIds = next.enabledLayerIds;
            fs.config.name = next.name;
        },
        setSelectedFeature: (state, action: PayloadAction<SelectedFeatureId | undefined>) => {
            state.selectedFeature = action.payload;
        },
        setSaveStatus: (state, action: PayloadAction<AsyncStatus>) => {
            state.saveStatus = action.payload;
        },
        setLayerFilter: (state, action: PayloadAction<{ featureServerId: string; layerId: number; where: string }>) => {
            const { featureServerId, layerId, where } = action.payload;
            const featureServer = findFeatureServer(state, featureServerId)!;
            const layer = featureServer.layers.find((l) => l.id === layerId)!;
            layer.where = where;
            layer.details = { status: AsyncStatus.Initial };
        },
    },
});

function checkLayer(layer: Layer, checked: boolean) {
    if (!checked) {
        if (layer.details.status === AsyncStatus.Loading) {
            layer.details = { status: AsyncStatus.Initial };
        }
        if (layer.features.status === AsyncStatus.Loading) {
            layer.features = { status: AsyncStatus.Initial };
        }
    }

    layer.checked = checked;
}

function findFeatureServer(state: State, id: string) {
    if (state.featureServers.status !== AsyncStatus.Success) {
        return;
    }

    return state.featureServers.data.find((fs) => fs.config.id === id);
}

export const selectArcgisFeatureServers = (state: RootState) => state.arcgis.featureServers;
export const selectArcgisFeatureServersStatus = (state: RootState) => state.arcgis.featureServers.status;
export const selectArcgisSaveStatus = (state: RootState) => state.arcgis.saveStatus;
export const selectArcgisSelectedFeature = (state: RootState) => state.arcgis.selectedFeature;
export const selectArcgisSelectedFeatureInfo = createSelector(
    [selectArcgisFeatureServers, selectArcgisSelectedFeature],
    (featureServers, selectedFeature) => {
        if (!selectedFeature || featureServers.status !== AsyncStatus.Success) {
            return;
        }

        for (const featureServer of featureServers.data) {
            if (featureServer.config.id === selectedFeature.featureServerId) {
                for (const layer of featureServer.layers) {
                    if (layer.features.status === AsyncStatus.Success && layer.id === selectedFeature.layerId) {
                        const feature = layer.features.data.features[selectedFeature.featureIndex];
                        return {
                            attributes: feature.attributes,
                            featureServerConfig: featureServer.config,
                            layer,
                        } as SelectedFeatureInfo;
                    }
                }
            }
        }
    }
);

const { actions, reducer } = arcgisSlice;
export { actions as arcgisActions, reducer as arcgisReducer };
