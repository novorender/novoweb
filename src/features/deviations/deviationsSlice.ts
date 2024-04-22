import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { GroupStatus } from "contexts/objectGroups";
import { resetView, selectBookmark } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

import {
    DeviationCalculationStatus,
    DeviationForm,
    DeviationType,
    LegendGroupInfo,
    UiDeviationConfig,
    UiDeviationProfile,
} from "./deviationTypes";

const initialState = {
    calculationStatus: {
        status: DeviationCalculationStatus.Initial,
    } as
        | { status: Exclude<DeviationCalculationStatus, DeviationCalculationStatus.Error> }
        | { status: DeviationCalculationStatus.Error; error: string },
    config: { status: AsyncStatus.Initial } as AsyncState<UiDeviationConfig>,
    deviationForm: undefined as DeviationForm | undefined,
    selectedProfileId: undefined as string | undefined,
    selectedSubprofileIndex: undefined as number | undefined,
    saveStatus: { status: AsyncStatus.Initial } as AsyncState<string>,
    // Stores pixel position of the rightmost deviation label
    // in follow path 2D view, which is used to position the legend
    rightmost2dDeviationCoordinate: undefined as number | undefined,
    hiddenLegendGroups: {} as { [profileId: string]: { [subprofileIndex: number]: string[] } },
    isLegendFloating: true,
};

type State = typeof initialState;

export const deviationsSlice = createSlice({
    name: "deviations",
    initialState: initialState,
    reducers: {
        setCalculationStatus: (state, action: PayloadAction<State["calculationStatus"]>) => {
            state.calculationStatus = action.payload;
        },
        setProfiles: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;
        },
        // Deviations can be loaded after selected profile ID is set in case of bookmarks.
        // In this case only update selected profile/subprofile info if they are invalid.
        initFromProfileIndex: (state, action: PayloadAction<{ index: number }>) => {
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }

            const { profiles } = state.config.data;
            if (profiles.length === 0) {
                state.selectedProfileId = undefined;
                state.selectedSubprofileIndex = undefined;
            }

            const { index } = action.payload;
            if (!state.selectedProfileId || !profiles.some((p) => p.id === state.selectedProfileId)) {
                if (index >= 0 && index < profiles.length) {
                    state.selectedProfileId = profiles[index].id;
                } else {
                    state.selectedProfileId = profiles[0].id;
                }
            }

            const profile = profiles.find((p) => p.id === state.selectedProfileId)!;
            if (
                state.selectedSubprofileIndex === undefined ||
                state.selectedSubprofileIndex >= profile.subprofiles.length
            ) {
                state.selectedSubprofileIndex = 0;
            }
        },
        setProfile: (
            state,
            action: PayloadAction<{ id: string; profile: UiDeviationProfile; setColorsForAll?: boolean }>
        ) => {
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }

            const { id, profile: newProfile, setColorsForAll } = action.payload;
            const profiles = state.config.data;

            for (let i = 0; i < profiles.profiles.length; i++) {
                const profile = profiles.profiles[i];
                if (id === profile.id) {
                    profiles.profiles[i] = newProfile;
                } else if (setColorsForAll) {
                    profile.colors!.colorStops = newProfile.colors.colorStops;
                }
            }
        },
        deleteProfile: (state, action: PayloadAction<string>) => {
            if (state.config.status !== AsyncStatus.Success) {
                return;
            }

            const id = action.payload;
            const profiles = state.config.data;
            profiles.profiles = profiles.profiles.filter((p) => p.id !== id);

            if (id === state.selectedProfileId) {
                state.selectedProfileId = profiles.profiles[0]?.id;
            }
        },
        setDeviationForm: (state, action: PayloadAction<DeviationForm | undefined>) => {
            state.deviationForm = action.payload;
        },
        setSelectedProfileId: (state, action: PayloadAction<string | undefined>) => {
            state.selectedProfileId = action.payload;
            if (state.config.status !== AsyncStatus.Success) {
                state.selectedSubprofileIndex = undefined;
                return;
            }

            if (state.selectedProfileId) {
                state.selectedSubprofileIndex = 0;
            } else {
                state.selectedSubprofileIndex = undefined;
            }
        },
        setSelectedSubprofileIndex: (state, action: PayloadAction<State["selectedSubprofileIndex"]>) => {
            state.selectedSubprofileIndex = action.payload;
        },
        setSaveStatus: (state, action: PayloadAction<State["saveStatus"]>) => {
            state.saveStatus = action.payload;
        },
        setRightmost2dDeviationCoordinate: (state, action: PayloadAction<State["rightmost2dDeviationCoordinate"]>) => {
            state.rightmost2dDeviationCoordinate = action.payload;
        },
        setIsLegendFloating: (state, action: PayloadAction<State["isLegendFloating"]>) => {
            state.isLegendFloating = action.payload;
        },
        resetHiddenLegendGroupsForProfile: (state, action: PayloadAction<{ profileId: string }>) => {
            const { profileId } = action.payload;
            if (state.hiddenLegendGroups[profileId]) {
                state.hiddenLegendGroups[profileId] = {};
            }
        },
        toggleHiddenLegendGroup: (state, action: PayloadAction<{ groupId: string; hidden: boolean }>) => {
            const profileId = state.selectedProfileId;
            const subprofileIndex = state.selectedSubprofileIndex;
            if (!profileId || subprofileIndex === undefined) {
                return;
            }

            const { groupId, hidden } = action.payload;
            let profile = state.hiddenLegendGroups[profileId];
            if (!profile) {
                profile = {};
                state.hiddenLegendGroups[profileId] = profile;
            }
            if (!profile[subprofileIndex]) {
                profile[subprofileIndex] = [];
            }
            const alreadyAdded = profile[subprofileIndex].includes(groupId);
            if (hidden && !alreadyAdded) {
                profile[subprofileIndex].push(groupId);
            } else if (!hidden && alreadyAdded) {
                profile[subprofileIndex] = profile[subprofileIndex].filter((id) => id !== groupId);
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(selectBookmark, (state, action) => {
            const { deviations } = action.payload;
            if (!deviations) {
                return;
            }

            if (deviations.isLegendFloating !== undefined) {
                state.isLegendFloating = deviations.isLegendFloating;
            }
            state.hiddenLegendGroups = {};
            if (deviations.profileId) {
                state.selectedProfileId = deviations.profileId;
                if (deviations.subprofileIndex !== undefined) {
                    state.selectedSubprofileIndex = deviations.subprofileIndex;
                } else {
                    state.selectedSubprofileIndex = 0;
                }

                if (deviations.hiddenGroupIds) {
                    state.hiddenLegendGroups[state.selectedProfileId] = {
                        [state.selectedSubprofileIndex]: deviations.hiddenGroupIds,
                    };
                }
                state.deviationForm = undefined;
                state.rightmost2dDeviationCoordinate = undefined;
            }
        });
        builder.addCase(resetView, (state, _action) => {
            state.hiddenLegendGroups = {};
            state.isLegendFloating = true;
        });
    },
});

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

const { actions, reducer } = deviationsSlice;
export { actions as deviationsActions, reducer as deviationsReducer };
