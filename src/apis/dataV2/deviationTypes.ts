import { VecRGBA } from "utils/color";

// A lot of optional fields because of older versions of deviations.json
export type DeviationProjectConfig = {
    version?: string;
    rebuildRequired: boolean;
    brepIds?: string[];
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
    // Calculation colors From group for mesh-to-points but To group for points-to-points,
    // so for points we're going to swap From and To when passing to calculation,
    // but in UI still show as defined by the user
    fromAndToSwapped?: boolean;
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
    favorites?: string[];
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
