import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { DeviationCalculationStatus, DeviationForm, UiDeviationConfig, UiDeviationProfile } from "./deviationTypes";

const initialState = {
    calculationStatus: {
        status: DeviationCalculationStatus.Initial,
    } as
        | { status: Exclude<DeviationCalculationStatus, DeviationCalculationStatus.Error> }
        | { status: DeviationCalculationStatus.Error; error: string },
    config: { status: AsyncStatus.Initial } as AsyncState<UiDeviationConfig>,
    deviationForm: undefined as DeviationForm | undefined,
    selectedProfileId: undefined as string | undefined,
    saveStatus: { status: AsyncStatus.Initial } as AsyncState<string>,
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
        },
        setSaveStatus: (state, action: PayloadAction<State["saveStatus"]>) => {
            state.saveStatus = action.payload;
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
export const selectSelectedProfile = createSelector(
    [selectDeviationProfileList, selectSelectedProfileId],
    (profiles, profileId) => {
        return profileId ? profiles.find((p) => p.id === profileId) : undefined;
    }
);
export const selectSaveStatus = (state: RootState) => state.deviations.saveStatus;

const { actions, reducer } = deviationsSlice;
export { actions as deviationsActions, reducer as deviationsReducer };
