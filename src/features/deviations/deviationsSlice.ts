import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncState, AsyncStatus } from "types/misc";

export enum DeviationCalculationStatus {
    Initial,
    Inactive,
    Loading,
    Running,
    Error,
}

const initialState = {
    calculationStatus: {
        status: DeviationCalculationStatus.Initial,
    } as
        | { status: Exclude<DeviationCalculationStatus, DeviationCalculationStatus.Error> }
        | { status: DeviationCalculationStatus.Error; error: string },
    profiles: { status: AsyncStatus.Initial } as AsyncState<string[]>,
};

type State = typeof initialState;

export const deviationsSlice = createSlice({
    name: "deviations",
    initialState: initialState,
    reducers: {
        setCalculationStatus: (state, action: PayloadAction<State["calculationStatus"]>) => {
            state.calculationStatus = action.payload;
        },
        setProfiles: (state, action: PayloadAction<State["profiles"]>) => {
            state.profiles = action.payload;
        },
    },
});

export const selectDeviationProfiles = (state: RootState) => state.deviations.profiles;
export const selectDeviationProfilesData = (state: RootState) =>
    state.deviations.profiles.status === AsyncStatus.Success ? state.deviations.profiles.data : [];
export const selectDeviationCalculationStatus = (state: RootState) => state.deviations.calculationStatus;

const { actions, reducer } = deviationsSlice;
export { actions as deviationsActions, reducer as deviationsReducer };
