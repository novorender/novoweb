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

export enum SymbolStyle {
    esriSLSSolid = "esriSLSSolid", // line
    esriSFSSolid = "esriSFSSolid", // face
}

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
    style: SymbolStyle;
    color: ColorRGBA;
    width: number;
};

export type LayerStyleEsriSFS = {
    type: "esriSFS";
    style: SymbolStyle;
    color: ColorRGBA;
    outline: LayerStyleEsriSLS;
};

export type LayerDrawingInfo = {
    renderer: {
        type: "simple";
        symbol: LayerStyleEsriPMS | LayerStyleEsriSLS | LayerStyleEsriSFS;
    };
    transparency?: number;
};
