import { DeviationProjectConfig, PointToPointGroup, PointToTriangleGroup } from "apis/dataV2/deviationTypes";

import { DeviationForm, DeviationType, SubprofileGroup, UiDeviationConfig, UiDeviationProfile } from "./deviationTypes";

export const MAX_DEVIATION_PROFILE_COUNT = 4;
export const PARAM_BOUND_PRECISION = 0;
export const NEW_DEVIATION_ID = "new";
export const EMPTY_PARAMETER_BOUNDS = [0, 0] as [number, number];

export function newDeviationForm(): DeviationForm {
    return {
        id: NEW_DEVIATION_ID,
        copyFromProfileId: { value: undefined },
        name: { value: "" },
        deviationType: { value: DeviationType.PointToTriangle },
        subprofiles: [newDeviationSubprofile()],
        favorites: { value: [] },

        colorSetup: {
            absoluteValues: false,
            colorStops: { value: [] },
        },
        hasFromAndTo: true,
        index: -1,
        subprofileIndex: 0,
    };
}

export function newDeviationSubprofile(): SubprofileGroup {
    return {
        groups1: { value: [] },
        groups2: { value: [] },
        centerLine: {
            enabled: false,
            id: { value: undefined },
            parameterBounds: { value: EMPTY_PARAMETER_BOUNDS },
        },
        tunnelInfo: {
            enabled: false,
            heightToCeiling: { value: "" },
        },
    };
}

export function profileToDeviationForm(profile: UiDeviationProfile): DeviationForm {
    return {
        id: profile.id,
        copyFromProfileId: { value: profile.copyFromProfileId },
        name: { value: profile.name },
        favorites: { value: profile.favorites },
        subprofiles: profile.subprofiles.map((sp) => ({
            groups1: { value: sp.from.groupIds },
            groups2: { value: sp.to.groupIds },
            centerLine: sp.centerLine
                ? {
                      enabled: true,
                      id: { value: sp.centerLine.objectId },
                      brepId: sp.centerLine.brepId,
                      parameterBounds: { value: sp.centerLine.parameterBounds },
                  }
                : {
                      enabled: false,
                      id: { value: undefined },
                      parameterBounds: { value: EMPTY_PARAMETER_BOUNDS },
                  },
            tunnelInfo: {
                enabled: sp.heightToCeiling !== undefined,
                heightToCeiling: { value: `${sp.heightToCeiling ?? 0}` },
            },
        })),
        colorSetup: {
            absoluteValues: profile.colors.absoluteValues,
            colorStops: { value: profile.colors.colorStops },
        },
        deviationType: { value: profile.deviationType },
        hasFromAndTo: profile.hasFromAndTo,
        index: profile.index,
        subprofileIndex: 0,
    };
}

export function uiConfigToServerConfig(config: UiDeviationConfig): DeviationProjectConfig {
    const brepIds = new Set<string>();

    for (const profile of config.profiles) {
        for (const sp of profile.subprofiles) {
            if (sp.centerLine?.brepId) {
                brepIds.add(sp.centerLine.brepId);
            }
        }
    }

    const getProfileAttrs = (p: UiDeviationProfile) => {
        return {
            id: p.id,
            name: p.name,
            copyFromProfileId: p.copyFromProfileId,
            colors: p.colors,
            favorites: p.favorites,
            subprofiles: p.subprofiles.map((sp) => ({
                from: sp.from,
                to: sp.to,
                centerLine: sp.centerLine,
                heightToCeiling: sp.heightToCeiling,
            })),
        } as PointToPointGroup | PointToTriangleGroup;
    };

    return {
        version: config.version,
        rebuildRequired: config.rebuildRequired,
        brepIds: [...brepIds],
        pointToTriangle: {
            groups: config.profiles
                .filter((p) => p.deviationType === DeviationType.PointToTriangle)
                .map(getProfileAttrs),
        },
        pointToPoint: {
            groups: config.profiles.filter((p) => p.deviationType === DeviationType.PointToPoint).map(getProfileAttrs),
        },
        runData: config.runData,
    };
}
