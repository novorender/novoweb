import { VecRGBA } from "utils/color";

// A lot of optional fields because of older versions of deviations.json
export type DeviationProjectConfig = {
    version?: string;
    rebuildRequired: boolean;
    pointToTriangle: { groups: PointToTriangleGroup[] };
    pointToPoint: { groups: PointToPointGroup[] };
};

export type DeviationProfileBase = {
    id?: string;
    name: string;
    copyFromProfileId?: string;
    colors?: ColorConfig;
    centerLine?: CenterLine;
    heightToCeiling?: number;
    favorites?: string[];
};

export type PointToPointGroup = DeviationProfileBase & {
    from: {
        groupIds: string[];
        objectIds: number[];
    };
    to: {
        groupIds: string[];
        objectIds: number[];
    };
};

export type PointToTriangleGroup = DeviationProfileBase & {
    // from and to are introduced in newer versions
    // keeping groupIds/objectIds for compat
    from?: {
        groupIds: string[];
        objectIds: number[];
    };
    to?: {
        groupIds: string[];
        objectIds: number[];
    };
    groupIds: string[];
    objectIds: number[];
};

export type ColorConfig = {
    absoluteValues: boolean;
    colorStops: ColorStop[];
};

export type ColorStop = {
    position: number;
    color: VecRGBA;
};

export type CenterLine = {
    brepId: string;
    parameterBounds: [number, number];
};
