import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { ReadonlyVec3 } from "gl-matrix";

import { AsyncState } from "types/misc";

import { FeatureServerDefinition, FeatureSymbol, LayerDrawingInfo, LayerGeometryType } from "./arcgisTypes";

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
