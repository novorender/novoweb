import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncState, AsyncStatus } from "types/misc";

import {
    DeviationCalculationStatus,
    DeviationForm,
    FavoriteGroupState,
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
        setSelectedSubprofileLegendGroups: (state, action: PayloadAction<FavoriteGroupState[]>) => {
            if (
                state.config.status !== AsyncStatus.Success ||
                !state.selectedProfileId ||
                state.selectedSubprofileIndex === undefined
            ) {
                return;
            }

            const profile = state.config.data.profiles.find((p) => p.id === state.selectedProfileId)!;
            const sp = profile.subprofiles[state.selectedSubprofileIndex];
            sp.legendGroups = action.payload;
        },
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
export const selectDeviationLegendGroups = createSelector([selectSelectedSubprofile], (sp) => sp?.legendGroups);

const { actions, reducer } = deviationsSlice;
export { actions as deviationsActions, reducer as deviationsReducer };
