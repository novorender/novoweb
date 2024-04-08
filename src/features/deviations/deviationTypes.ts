import { ColorConfig, ColorStop, DeviationRunData } from "apis/dataV2/deviationTypes";
import { GroupStatus } from "contexts/objectGroups";

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
    subprofiles: UiDeviationSubprofile[];
};

export type UiDeviationSubprofile = {
    from: {
        groupIds: string[];
        objectIds: number[];
    };
    to: {
        groupIds: string[];
        objectIds: number[];
    };
    favorites: string[];
    centerLine?: UiCenterLine;
    heightToCeiling?: number;
    legendGroups: FavoriteGroupState[]; // not saved anywhere
};

export type UiCenterLine = {
    brepId: string;
    objectId: number;
    parameterBounds: [number, number];
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
    colorSetup: ColorSetupGroup;
    hasFromAndTo: boolean;
    index: number;
    subprofiles: SubprofileGroup[];
    subprofileIndex: number;
};

export type SubprofileGroup = {
    groups1: FormField<string[]>;
    groups2: FormField<string[]>;
    favorites: FormField<string[]>;
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

export type FavoriteGroupState = {
    id: string;
    status: GroupStatus;
    usesGroupColor: boolean;
};

export type ObjectGroupExt = { id: string; name: string; deleted?: boolean };
