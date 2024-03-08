import { DeviationProjectConfig, PointToPointGroup, PointToTriangleGroup } from "apis/dataV2/deviationTypes";

import { DeviationForm, DeviationType, UiDeviationConfig, UiDeviationProfile } from "./deviationTypes";

export const MAX_DEVIATION_PROFILE_COUNT = 4;
export const PARAM_BOUND_PRECISION = 2;
export const NEW_DEVIATION_ID = "new";
export const EMPTY_PARAMETER_BOUNDS = [0, 0] as [number, number];

export function newDeviationForm(): DeviationForm {
    return {
        id: NEW_DEVIATION_ID,
        copyFromProfileId: { value: undefined },
        name: { value: "" },
        deviationType: { value: DeviationType.PointToTriangle },
        groups1: { value: [] },
        groups2: { value: [] },
        favorites: { value: [] },
        centerLine: {
            enabled: false,
            id: { value: undefined },
            parameterBounds: { value: EMPTY_PARAMETER_BOUNDS },
        },
        tunnelInfo: {
            enabled: false,
            heightToCeiling: { value: "" },
        },
        colorSetup: {
            absoluteValues: false,
            colorStops: { value: [] },
        },
        hasFromAndTo: true,
        index: -1,
    };
}

export function profileToDeviationForm(profile: UiDeviationProfile): DeviationForm {
    return {
        id: profile.id,
        copyFromProfileId: { value: profile.copyFromProfileId },
        name: { value: profile.name },
        groups1: { value: profile.from.groupIds },
        groups2: { value: profile.to.groupIds },
        favorites: { value: profile.favorites },
        centerLine: profile.centerLine
            ? {
                  enabled: true,
                  id: { value: undefined },
                  brepId: profile.centerLine.brepId,
                  parameterBounds: { value: profile.centerLine.parameterBounds },
              }
            : {
                  enabled: false,
                  id: { value: undefined },
                  parameterBounds: { value: EMPTY_PARAMETER_BOUNDS },
              },
        colorSetup: {
            absoluteValues: profile.colors.absoluteValues,
            colorStops: { value: profile.colors.colorStops },
        },
        deviationType: { value: profile.deviationType },
        tunnelInfo: {
            enabled: profile.heightToCeiling !== undefined,
            heightToCeiling: { value: `${profile.heightToCeiling ?? 0}` },
        },
        hasFromAndTo: profile.hasFromAndTo,
        index: profile.index,
    };
}

export function uiConfigToServerConfig(config: UiDeviationConfig): DeviationProjectConfig {
    const getSharedProfileAttrs = (p: UiDeviationProfile) => {
        return {
            id: p.id,
            name: p.name,
            copyFromProfileId: p.copyFromProfileId,
            from: p.from,
            to: p.to,
            centerLine: p.centerLine,
            colors: p.colors,
            favorites: p.favorites,
            heightToCeiling: p.heightToCeiling,
        } as PointToPointGroup | PointToTriangleGroup;
    };

    return {
        version: config.version,
        rebuildRequired: config.rebuildRequired,
        runData: config.runData,
        pointToTriangle: {
            groups: config.profiles
                .filter((p) => p.deviationType === DeviationType.PointToTriangle)
                .map((p) => {
                    const groupIds = [...p.from.groupIds, ...p.to.groupIds];
                    const objectIds: Set<number> = new Set();
                    for (const id of p.from.objectIds) {
                        objectIds.add(id);
                    }
                    for (const id of p.to.objectIds) {
                        objectIds.add(id);
                    }

                    return {
                        ...getSharedProfileAttrs(p),
                        groupIds,
                        objectIds: [...objectIds],
                    };
                }),
        },
        pointToPoint: {
            groups: config.profiles
                .filter((p) => p.deviationType === DeviationType.PointToPoint)
                .map((p) => {
                    return {
                        ...getSharedProfileAttrs(p),
                    } as PointToPointGroup;
                }),
        },
    };
}
