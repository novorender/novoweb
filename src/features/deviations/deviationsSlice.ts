import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { initScene } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";
import { VecRGBA } from "utils/color";

export enum DeviationMode {
    On = "on",
    Off = "off",
    Mix = "mix",
}

export type Deviation = {
    color: VecRGBA;
    deviation: number;
};

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
    deviations: {
        index: 0,
        mode: DeviationMode.Off,
        colors: [] as Deviation[],
    },
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
        setDeviations: (state, action: PayloadAction<Partial<State["deviations"]>>) => {
            state.deviations = { ...state.deviations, ...action.payload };
        },
        setProfiles: (state, action: PayloadAction<State["profiles"]>) => {
            state.profiles = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(initScene, (state, action) => {
            console.log("DEVIATIONS");
        });
    },
});

export const selectDeviations = (state: RootState) => state.deviations.deviations;
export const selectDeviationProfiles = (state: RootState) => state.deviations.profiles;
export const selectDeviationProfilesData = (state: RootState) =>
    state.deviations.profiles.status === AsyncStatus.Success ? state.deviations.profiles.data : [];
export const selectDeviationCalculationStatus = (state: RootState) => state.deviations.calculationStatus;

const { actions, reducer } = deviationsSlice;
export { actions as deviationsActions, reducer as deviationsReducer };
