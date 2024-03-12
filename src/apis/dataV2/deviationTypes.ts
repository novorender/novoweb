import { VecRGBA } from "utils/color";

// A lot of optional fields because of older versions of deviations.json
export type DeviationProjectConfig = {
    version?: string;
    rebuildRequired: boolean;
    pointToTriangle: { groups: PointToTriangleGroup[] };
    pointToPoint: { groups: PointToPointGroup[] };
    runData?: DeviationRunData;
};

export type DeviationRunData = {
    runTime: string;
    rebuilt: boolean;
    version: string;
};

export type DeviationProfileBase = {
    id?: string;
    name: string;
    copyFromProfileId?: string;
    colors?: ColorConfig;
    favorites?: string[];
    subprofiles?: DeviationSubprofile[];
};

export type DeviationSubprofile = {
    from: {
        groupIds: string[];
        objectIds: number[];
    };
    to: {
        groupIds: string[];
        objectIds: number[];
    };
    centerLine?: CenterLine;
    heightToCeiling?: number;
};

export type PointToPointGroup = DeviationProfileBase & {
    from?: {
        groupIds: string[];
        objectIds: number[];
    };
    to?: {
        groupIds: string[];
        objectIds: number[];
    };
};

export type PointToTriangleGroup = DeviationProfileBase & {
    groupIds?: string[];
    objectIds?: number[];
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
