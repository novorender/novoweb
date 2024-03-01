import { IFeature } from "@esri/arcgis-rest-request";
import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ReadonlyVec3 } from "gl-matrix";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { FeatureServerDefinition, FeatureSymbol, LayerDrawingInfo, LayerGeometryType } from "./arcgisTypes";
import { areArraysEqual, getTotalAabb2, iFeatureToLayerFeature } from "./utils";

const initialState = {
    featureServers: { status: AsyncStatus.Initial } as AsyncState<FeatureServer[]>,
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
export type FeatureServer = {
    id: string;
    url: string;
    name: string;
    layerWhere?: string;
    enabledLayerIds?: number[];
    definition: AsyncState<FeatureServerDefinition>;
    savedLayers?: { [layerId: number]: LayerConfig }; // Only used when loading data
    layers: Layer[];
};

export type Layer = {
    id: number;
    name: string;
    geometryType: LayerGeometryType;
    checked: boolean;
    where?: string;
    aabb?: AABB2;
    definition: AsyncState<LayerDefinition>;
    features: AsyncState<LayerFeature[]>;
};

export type LayerDefinition = {
    fields: LayerField[];
    drawingInfo: LayerDrawingInfo;
    objectIdField: string;
};

export type LayerField = {
    name: string;
};

export type FeatureGeometryPoint = { x: number; y: number; z: number };
export type FeatureGeometryPolyline = { paths: ReadonlyVec3[][] };
export type FeatureGeometryPolygon = { rings: ReadonlyVec3[][] };
export type FeatureGeometry = FeatureGeometryPoint | FeatureGeometryPolyline | FeatureGeometryPolygon;

export type LayerFeature = {
    attributes: {
        [key: string]: string | number;
    };
    geometry?: FeatureGeometry;
    aabb?: AABB2;
    computedSymbol?: FeatureSymbol;
};

export type SelectedFeatureId = {
    featureServerId: string;
    layerId: number;
    featureId: number;
};

export type SelectedFeatureInfo = {
    featureServer: FeatureServer;
    layer: Layer;
    featureId: number;
};

export const arcgisSlice = createSlice({
    name: "arcgis",
    initialState: initialState,
    reducers: {
        setFeatureServers: (state, action: PayloadAction<AsyncState<FeatureServer[]>>) => {
            state.featureServers = action.payload;
        },
        setFeatureServerDefinition: (
            state,
            action: PayloadAction<{ id: string; definition: AsyncState<FeatureServerDefinition> }>
        ) => {
            if (state.featureServers.status !== AsyncStatus.Success) {
                return;
            }
            const { id, definition } = action.payload;
            const featureServer = state.featureServers.data.find((fs) => fs.id === id)!;
            const enabledLayerIds = featureServer.enabledLayerIds;
            featureServer.definition = definition;

            switch (definition.status) {
                case AsyncStatus.Success: {
                    let layers = definition.data.layers;
                    if (enabledLayerIds) {
                        layers = layers.filter((l) => enabledLayerIds.includes(l.id));
                    }
                    featureServer.layers = layers.map((l) => {
                        const layerConfig = featureServer.savedLayers && featureServer.savedLayers[l.id];
                        return {
                            id: l.id,
                            name: l.name,
                            geometryType: l.geometryType,
                            checked: layerConfig?.checked ?? false,
                            where: layerConfig?.where,
                            definition: { status: AsyncStatus.Initial },
                            features: { status: AsyncStatus.Initial },
                        } as Layer;
                    });

                    featureServer.savedLayers = undefined;

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
                    definition?: AsyncState<LayerDefinition>;
                    features?: AsyncState<IFeature[]>;
                    where?: string;
                }[]
            >
        ) => {
            for (const { featureServerId, layerId, definition, features } of action.payload) {
                const featureServer = findFeatureServer(state, featureServerId)!;
                const layer = featureServer.layers.find((l) => l.id === layerId)!;

                if (definition) {
                    layer.definition = definition;
                }

                if (features) {
                    if (features.status === AsyncStatus.Success) {
                        if (layer.definition.status === AsyncStatus.Success) {
                            const drawingInfo = layer.definition.data.drawingInfo;
                            const newFeatures = features.data.map((f) => iFeatureToLayerFeature(drawingInfo, f));
                            layer.features = { status: AsyncStatus.Success, data: newFeatures };
                            const nonEmptyAabbs = newFeatures.filter((e) => e.aabb).map((e) => e.aabb) as AABB2[];
                            layer.aabb = nonEmptyAabbs.length > 0 ? getTotalAabb2(nonEmptyAabbs) : undefined;
                        }
                    } else {
                        layer.features = features;
                    }
                }
            }
        },
        checkFeature: (state, action: PayloadAction<{ featureServerId: string; checked: boolean }>) => {
            const { featureServerId, checked } = action.payload;
            const featureServer = findFeatureServer(state, featureServerId)!;

            for (const layer of featureServer.layers) {
                checkLayer(layer, checked);
            }

            const selected = state.selectedFeature;
            if (!checked && selected?.featureServerId === featureServerId) {
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
            state.featureServers.data = state.featureServers.data.filter((e) => e.id !== id);

            if (state.selectedFeature?.featureServerId === id) {
                state.selectedFeature = undefined;
            }
        },
        addFeatureServer: (state, action: PayloadAction<FeatureServer>) => {
            if (state.featureServers.status !== AsyncStatus.Success) {
                return;
            }

            state.featureServers.data.push(action.payload);
        },
        updateFeatureServer: (state, action: PayloadAction<FeatureServer>) => {
            const next = action.payload;

            const fs = findFeatureServer(state, next.id)!;
            const isSelected = state.selectedFeature?.featureServerId === fs.id;

            if (fs.url !== next.url || !areArraysEqual(fs.enabledLayerIds, next.enabledLayerIds)) {
                fs.url = next.url;
                fs.definition = { status: AsyncStatus.Initial };
                fs.layers = [];
                if (isSelected) {
                    state.selectedFeature = undefined;
                }
            }

            if (fs.layerWhere != next.layerWhere) {
                fs.layerWhere = next.layerWhere;
                for (const layer of fs.layers) {
                    layer.features = { status: AsyncStatus.Initial };
                }
            }

            fs.enabledLayerIds = next.enabledLayerIds;
            fs.name = next.name;
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
            layer.features = { status: AsyncStatus.Initial };
        },
    },
});

function checkLayer(layer: Layer, checked: boolean) {
    if (!checked) {
        if (layer.definition.status === AsyncStatus.Loading) {
            layer.definition = { status: AsyncStatus.Initial };
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

    return state.featureServers.data.find((fs) => fs.id === id);
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

        const fs = featureServers.data.find((fs) => fs.id === selectedFeature.featureServerId);
        if (!fs) {
            return;
        }

        const layer = fs.layers.find((l) => l.id === selectedFeature.layerId);
        if (
            !layer ||
            layer.definition.status !== AsyncStatus.Success ||
            layer.features.status !== AsyncStatus.Success
        ) {
            return;
        }

        const definition = layer.definition.data;
        const feature = layer.features.data.find(
            (f) => f.attributes[definition.objectIdField] === selectedFeature.featureId
        );
        if (!feature) {
            return;
        }

        return {
            featureServer: fs,
            layer,
            featureId: selectedFeature.featureId,
        } as SelectedFeatureInfo;
    }
);

const { actions, reducer } = arcgisSlice;
export { actions as arcgisActions, reducer as arcgisReducer };
