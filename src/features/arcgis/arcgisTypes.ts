import { IFeature } from "@esri/arcgis-rest-request";
import { ColorRGBA } from "@novorender/webgl-api";

// Non exhaustive types for ArcGIS responses
// Only listing what's used

export type FeatureServerDefinition = {
    layers: LayerSimpleDefinition[];
};

export enum LayerGeometryType {
    esriGeometryPoint = "esriGeometryPoint",
    esriGeometryPolyline = "esriGeometryPolyline",
    esriGeometryPolygon = "esriGeometryPolygon",
}

// The one that comes togethe with server definition
export type LayerSimpleDefinition = {
    id: number;
    name: string;
    type: string; // Can be more detailed, e.g. 'Feature Layer'
    geometryType: LayerGeometryType;
};

export type LayerQueryParams = {
    where: string;
    outFields?: string;
    objectIds?: number;
    outSR?: string;
    returnIdsOnly?: boolean;
    returnCountOnly?: boolean;
    returnGeometry?: boolean;
};

export type LayerQueryResp = {
    features: IFeature[];
    fields: {
        name: string;
    }[];
};

export type LayerStyleEsriPMS = {
    type: "esriPMS";
    url: string;
    imageData: string; // base64
    contentType: string;
    width: number;
    height: number;
};

export type LayerStyleEsriSLS = {
    type: "esriSLS";
    style: "esriSLSSolid" | "esriSLSDash" | "esriSLSDashDot";
    color: ColorRGBA;
    width: number;
};

export type LayerStyleEsriSFS = {
    type: "esriSFS";
    style: "esriSFSSolid" | "esriSFSBackwardDiagonal" | "esriSFSForwardDiagonal" | "esriSFSDiagonalCross";
    color: ColorRGBA;
    outline: LayerStyleEsriSLS;
};

export type FeatureSymbol = LayerStyleEsriPMS | LayerStyleEsriSLS | LayerStyleEsriSFS;

export type UniqueValueRenderer = {
    type: "uniqueValue";
    field1: string;
    fieldDelimiter: string;
    uniqueValueInfos: UniqueValueInfo[];
    defaultSymbol: FeatureSymbol;
};

export type UniqueValueInfo = {
    label: string;
    value: string;
    symbol: FeatureSymbol;
};

export type SimpleRenderer = {
    type: "simple";
    symbol: FeatureSymbol;
};

export type LayerDrawingInfo = {
    renderer: SimpleRenderer | UniqueValueRenderer;
    transparency?: number;
};
