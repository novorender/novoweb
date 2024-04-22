import { createSelector } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { GroupStatus } from "contexts/objectGroups";
import { AsyncStatus } from "types/misc";

import { DeviationType, LegendGroupInfo } from "./deviationTypes";

export const selectDeviationProfiles = (state: RootState) => state.deviations.config;
export const selectDeviationProfileList = createSelector([selectDeviationProfiles], (profiles) => {
    if (profiles.status !== AsyncStatus.Success) {
        return [];
    }
    return profiles.data.profiles;
});
export const selectDeviationCalculationStatus = (state: RootState) => state.deviations.calculationStatus;
export const selectDeviationForm = (state: RootState) => state.deviations.deviationForm;
export const selectSelectedProfileId = (state: RootState) => state.deviations.selectedProfileId;
export const selectSelectedSubprofileIndex = (state: RootState) => state.deviations.selectedSubprofileIndex;
export const selectSelectedProfile = createSelector(
    [selectDeviationProfileList, selectSelectedProfileId],
    (profiles, profileId) => {
        return profileId ? profiles.find((p) => p.id === profileId) : undefined;
    }
);

export const selectSelectedSubprofile = createSelector(
    [selectSelectedProfile, selectSelectedSubprofileIndex],
    (profile, index) => (profile && index !== undefined ? profile.subprofiles[index] : undefined)
);
export const selectSelectedCenterLineId = createSelector([selectSelectedSubprofile], (sp) => sp?.centerLine?.brepId);
export const selectSelectedCenterLineFollowPathId = createSelector(
    [selectSelectedSubprofile],
    (sp) => sp?.centerLine?.objectId
);
export const selectSaveStatus = (state: RootState) => state.deviations.saveStatus;
export const selectRightmost2dDeviationCoordinate = (state: RootState) =>
    state.deviations.rightmost2dDeviationCoordinate;
export const selectIsLegendFloating = (state: RootState) => state.deviations.isLegendFloating;
export const selectHiddenLegendGroups = (state: RootState) => state.deviations.hiddenLegendGroups;
const selectCurrentHiddenLegendGroups = createSelector(
    [selectSelectedProfileId, selectSelectedSubprofileIndex, selectHiddenLegendGroups],
    (profileId, spIndex, allHiddenGroups) => {
        if (!profileId || spIndex === undefined) {
            return;
        }
        return allHiddenGroups[profileId]?.[spIndex];
    }
);
export const selectDeviationLegendGroups = createSelector(
    [selectSelectedProfile, selectSelectedSubprofileIndex, selectSelectedSubprofile, selectCurrentHiddenLegendGroups],
    (profile, spIndex, sp, hiddenGroupIds) => {
        if (!profile || spIndex === undefined || !sp) {
            return [];
        }

        const [colored, others] =
            profile.deviationType === DeviationType.PointToTriangle || profile.fromAndToSwapped
                ? [sp.from.groupIds, sp.to.groupIds]
                : [sp.to.groupIds, sp.from.groupIds];

        const allOthers = [...others, ...sp.favorites].filter((id) => !colored.includes(id));

        return [
            ...colored.map((id) => ({ id, isDeviationColored: true })),
            ...allOthers.map((id) => ({ id, isDeviationColored: false })),
        ].map((g) => ({
            ...g,
            status: hiddenGroupIds?.includes(g.id) ? GroupStatus.Hidden : GroupStatus.Selected,
        })) as LegendGroupInfo[];
    }
);
