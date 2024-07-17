import { FeatureGroupKey, featureGroups } from "config/features";

export const groupSorting = [
    featureGroups.favorites.key,
    featureGroups.clipping.key,
    featureGroups.filesAndAttributes,
    featureGroups.filter,
    featureGroups.integrations,
    featureGroups.measure,
    featureGroups.other,
    featureGroups.search,
    featureGroups.settings,
] as FeatureGroupKey[];
