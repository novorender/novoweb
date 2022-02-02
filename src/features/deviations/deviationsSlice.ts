import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
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

export enum DeviationsStatus {
    Initial,
    Saving,
    Creating,
    Editing,
    Error,
}

const initialState = {
    status: { status: DeviationsStatus.Initial } as
        | { status: Exclude<DeviationsStatus, DeviationsStatus.Editing> }
        | {
              status: DeviationsStatus.Editing;
              idx: number;
          },
    deviations: {
        mode: DeviationMode.Mix,
        colors: [] as Deviation[],
    },
};

type State = typeof initialState;

export const deviationsSlice = createSlice({
    name: "deviations",
    initialState: initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setDeviations: (state, action: PayloadAction<Partial<State["deviations"]>>) => {
            state.deviations = { ...state.deviations, ...action.payload };
        },
    },
});

export const selectDeviations = (state: RootState) => state.deviations.deviations;
export const selectDeviationsStatus = (state: RootState) => state.deviations.status;

const { actions, reducer } = deviationsSlice;
export { actions as deviationsActions, reducer as deviationsReducer };
