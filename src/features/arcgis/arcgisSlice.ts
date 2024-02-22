import { IFeature } from "@esri/arcgis-rest-request";
import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { computeFeatureAabb, getTotalAabb2 } from "./utils";

const initialState = {
    config: { status: AsyncStatus.Initial } as AsyncState<ArcgisWidgetConfig>,
    featureServers: [] as FeatureServerState[],
    saveStatus: AsyncStatus.Initial,
    selectedFeature: undefined as SelectedFeatureId | undefined,
};

type State = typeof initialState;

export type ArcgisWidgetConfig = {
    featureServers: FeatureServerConfig[];
};

export type FeatureServerConfig = {
    url: string;
    name: string;
    layerWhere?: string;
    checkedLayerIds?: number[];
};

export type SelectedFeatureId = {
    url: string;
    layerId: number;
    featureIndex: number;
};

export type SelectedFeatureInfo = {
    attributes: object;
    featureServerConfig: FeatureServerConfig;
    layer: FeatureLayerMeta;
    layerDetails: FeatureLayerDetails;
};

export type FeatureServerState = {
    url: string;
    meta: AsyncState<FeatureServerMeta>;
    layers: FeatureLayerState[];
};

export type FeatureServerMeta = {
    layers: FeatureLayerMeta[];
};

export type FeatureLayerMeta = {
    id: number;
    name: string;
    type: string; // Can be more detailed, e.g. 'Feature Layer'
};

export type FeatureLayerState = {
    meta: FeatureLayerMeta;
    checked: boolean;
    details: AsyncState<FeatureLayerDetails>;
    where?: string;
    aabb?: AABB2;
};

export type FeatureLayerDetailsResp = {
    features: IFeature[];
    fields: FeatureLayerField[];
};

export type FeatureLayerDetails = {
    features: IFeature[];
    featuresAabb: (AABB2 | undefined)[];
    fields: FeatureLayerField[];
};

export type FeatureLayerField = {
    name: string;
};

export const arcgisSlice = createSlice({
    name: "arcgis",
    initialState: initialState,
    reducers: {
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;

            switch (state.config.status) {
                case AsyncStatus.Success: {
                    state.featureServers = state.config.data.featureServers.map((config) => {
                        const prev = state.featureServers.find((s) => s.url === config.url);
                        return (
                            prev || {
                                url: config.url,
                                meta: { status: AsyncStatus.Initial },
                                layers: [],
                            }
                        );
                    });
                    break;
                }
                case AsyncStatus.Error:
                case AsyncStatus.Initial:
                    state.featureServers = [];
                    break;
            }
        },
        setFeatureServerMeta: (state, action: PayloadAction<{ url: string; meta: AsyncState<FeatureServerMeta> }>) => {
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }
            const { url, meta } = action.payload;
            const featureServer = state.featureServers.find((fs) => fs.url === url)!;
            featureServer.meta = meta;

            switch (meta.status) {
                case AsyncStatus.Success: {
                    const fsConfig = state.config.data.featureServers.find((fs) => fs.url === url)!;

                    featureServer.layers = meta.data.layers.map((l) => ({
                        meta: l,
                        details: { status: AsyncStatus.Initial },
                        checked: fsConfig.checkedLayerIds?.includes(l.id) ?? false,
                        aabb: undefined,
                    }));
                    break;
                }
                case AsyncStatus.Error:
                case AsyncStatus.Initial:
                    featureServer.layers = [];
                    break;
            }
        },
        setMultipleLayerDetails: (
            state,
            action: PayloadAction<
                {
                    url: string;
                    layerId: number;
                    details: AsyncState<FeatureLayerDetailsResp>;
                }[]
            >
        ) => {
            for (const { url, layerId, details } of action.payload) {
                const featureServer = state.featureServers.find((fs) => fs.url === url)!;
                const layer = featureServer.layers.find((l) => l.meta.id === layerId)!;

                if (details.status === AsyncStatus.Success) {
                    const data: FeatureLayerDetails = {
                        features: details.data.features,
                        featuresAabb: details.data.features.map(computeFeatureAabb),
                        fields: details.data.fields,
                    };
                    layer.details = { status: AsyncStatus.Success, data };
                    const nonEmptyAabbs = data.featuresAabb.filter((e) => e) as AABB2[];
                    layer.aabb = nonEmptyAabbs.length > 0 ? getTotalAabb2(nonEmptyAabbs) : undefined;
                } else {
                    layer.details = details;
                    layer.aabb = undefined;
                }
            }
        },
        checkFeature: (state, action: PayloadAction<{ url: string; checked: boolean }>) => {
            const { url, checked } = action.payload;
            const featureServer = state.featureServers.find((fs) => fs.url === url)!;
            if (featureServer.meta.status !== AsyncStatus.Success || state.config.status !== AsyncStatus.Success) {
                return;
            }

            for (const layer of featureServer.layers) {
                checkLayer(layer, checked);
            }

            const fsConfig = state.config.data.featureServers.find((fs) => fs.url === url)!;
            if (checked) {
                fsConfig.checkedLayerIds = featureServer.layers.map((l) => l.meta.id);
            } else {
                fsConfig.checkedLayerIds = [];
            }

            const selected = state.selectedFeature;
            if (!checked && selected && selected.url === url) {
                state.selectedFeature = undefined;
            }
        },
        checkFeatureLayer: (state, action: PayloadAction<{ url: string; layerId: number; checked: boolean }>) => {
            const { url, layerId, checked } = action.payload;
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }
            const featureServer = state.featureServers.find((fs) => fs.url === url)!;
            const layer = featureServer.layers.find((l) => l.meta.id === layerId)!;

            checkLayer(layer, checked);

            const fsConfig = state.config.data.featureServers.find((fs) => fs.url === url)!;
            if (checked && !(fsConfig.checkedLayerIds || []).includes(layerId)) {
                fsConfig.checkedLayerIds = [...(fsConfig.checkedLayerIds || []), layerId];
            } else if (!checked) {
                fsConfig.checkedLayerIds = (fsConfig.checkedLayerIds || []).filter((id) => id !== layerId);
            }

            const selected = state.selectedFeature;
            if (!checked && selected && selected.url === url && selected.layerId === layerId) {
                state.selectedFeature = undefined;
            }
        },
        removeFeatureServer: (state, action: PayloadAction<{ url: string }>) => {
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }
            const index = state.config.data.featureServers.findIndex((c) => c.url === action.payload.url);
            if (index === -1) {
                return;
            }

            state.config.data.featureServers.splice(index, 1);
            state.featureServers.splice(index, 1);

            if (state.selectedFeature?.url === action.payload.url) {
                state.selectedFeature = undefined;
            }
        },
        addFeatureServerConfig: (state, action: PayloadAction<FeatureServerConfig>) => {
            const config = action.payload;
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }

            state.config.data.featureServers.push(config);
            state.featureServers.push({
                url: config.url,
                meta: { status: AsyncStatus.Initial },
                layers: [],
            });
        },
        updateFeatureServerConfig: (
            state,
            action: PayloadAction<{ from: FeatureServerConfig; to: FeatureServerConfig }>
        ) => {
            const { from: prev, to: next } = action.payload;
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }

            const fsConfig = state.config.data.featureServers.find((c) => c.url === prev.url)!;
            const featureServer = state.featureServers.find((fs) => fs.url === prev.url)!;

            if (fsConfig.url !== next.url) {
                fsConfig.url = next.url;
                featureServer.url = next.url;
                featureServer.meta = { status: AsyncStatus.Initial };
                featureServer.layers = [];
            }

            if (fsConfig.layerWhere != next.layerWhere) {
                fsConfig.layerWhere = next.layerWhere;
                for (const layer of featureServer.layers) {
                    layer.details = { status: AsyncStatus.Initial };
                }
            }

            fsConfig.name = next.name;
        },
        setSelectedFeature: (state, action: PayloadAction<SelectedFeatureId | undefined>) => {
            state.selectedFeature = action.payload;
        },
        setSaveStatus: (state, action: PayloadAction<AsyncStatus>) => {
            state.saveStatus = action.payload;
        },
        setLayerFilter: (state, action: PayloadAction<{ url: string; layerId: number; where: string }>) => {
            const { url, layerId, where } = action.payload;
            const featureServer = state.featureServers.find((fs) => fs.url === url)!;
            const layer = featureServer.layers.find((l) => l.meta.id === layerId)!;
            layer.where = where;
            layer.details = { status: AsyncStatus.Initial };
        },
    },
});

function checkLayer(layer: FeatureLayerState, checked: boolean) {
    if (!checked && layer.details.status === AsyncStatus.Loading) {
        layer.details = { status: AsyncStatus.Initial };
    }

    layer.checked = checked;
}

export const selectArcgisWidgetConfig = (state: RootState) => state.arcgis.config;
export const selectArcgisFeatureServers = (state: RootState) => state.arcgis.featureServers;
export const selectArcgisSaveStatus = (state: RootState) => state.arcgis.saveStatus;
export const selectArcgisSelectedFeature = (state: RootState) => state.arcgis.selectedFeature;
export const selectArcgisSelectedFeatureInfo = createSelector(
    [selectArcgisWidgetConfig, selectArcgisFeatureServers, selectArcgisSelectedFeature],
    (config, featureServers, selectedFeature) => {
        if (!selectedFeature || config.status !== AsyncStatus.Success) {
            return;
        }

        for (const featureServer of featureServers) {
            if (featureServer.url === selectedFeature.url) {
                for (const layer of featureServer.layers) {
                    if (layer.details.status === AsyncStatus.Success && layer.meta.id === selectedFeature.layerId) {
                        const feature = layer.details.data.features[selectedFeature.featureIndex];
                        return {
                            attributes: feature.attributes,
                            featureServerConfig: config.data.featureServers.find((c) => c.url === featureServer.url)!,
                            layer: layer.meta,
                            layerDetails: layer.details.data,
                        } as SelectedFeatureInfo;
                    }
                }
            }
        }
    }
);

const { actions, reducer } = arcgisSlice;
export { actions as arcgisActions, reducer as arcgisReducer };
