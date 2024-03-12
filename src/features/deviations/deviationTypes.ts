import { ColorConfig, ColorStop, DeviationRunData, DeviationSubprofile } from "apis/dataV2/deviationTypes";

export enum DeviationCalculationStatus {
    Initial,
    Inactive,
    Loading,
    Running,
    Error,
}

export enum DeviationType {
    PointToPoint,
    PointToTriangle,
}

export type UiDeviationConfig = {
    version: string;
    rebuildRequired: boolean;
    profiles: UiDeviationProfile[];
    runData?: DeviationRunData;
};

// Similar to the one defined in dataV2 types, but with some runtime fields
// and most fields non optional
export type UiDeviationProfile = {
    id: string;
    name: string;
    deviationType: DeviationType;
    hasFromAndTo: boolean; // whether original PointToTriangle profile has from and to or just objectIds/groupsIds (old format)
    index: number; // index of deviation for coloring. -1 for none
    copyFromProfileId?: string;
    colors: ColorConfig;
    favorites: string[];
    subprofiles: DeviationSubprofile[];
};

// Deviation form
export interface FormField<T> {
    value: T;
    edited?: boolean;
}

export type DeviationForm = {
    id: string;
    name: FormField<string>;
    copyFromProfileId: FormField<string | undefined>;
    deviationType: FormField<DeviationType>;
    favorites: FormField<string[]>;
    colorSetup: ColorSetupGroup;
    hasFromAndTo: boolean;
    index: number;
    subprofiles: SubprofileGroup[];
    subprofileIndex: number;
};

export type SubprofileGroup = {
    groups1: FormField<string[]>;
    groups2: FormField<string[]>;
    centerLine: CenterLineGroup;
    tunnelInfo: TunnelInfoGroup;
};

export type CenterLineGroup = {
    enabled: boolean;
    id: FormField<number | undefined>;
    brepId?: string;
    parameterBounds: FormField<[number, number]>;
};

export type TunnelInfoGroup = {
    enabled: boolean;
    heightToCeiling: FormField<string>;
};

export type ColorSetupGroup = {
    absoluteValues: boolean;
    colorStops: FormField<ColorStopGroup[]>;
};

export type ColorStopGroup = ColorStop;
