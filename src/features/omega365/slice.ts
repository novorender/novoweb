import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Omega365Configuration } from "apis/dataV2/omega365Types";

const initialState = {
    config: null as Omega365Configuration | null,
    configDraft: null as Omega365Configuration | null,
    selectedViewId: null as string | null,
    snackbarMessage: null as string | null,
    omegaObjectId: null as number | null,
};

type State = typeof initialState;

export const omega365Slice = createSlice({
    name: "omega365",
    initialState: initialState,
    reducers: {
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;
        },
        setConfigDraft: (state, action: PayloadAction<State["configDraft"]>) => {
            state.configDraft = action.payload;
        },
        setSelectedViewId: (state, action: PayloadAction<State["selectedViewId"]>) => {
            state.selectedViewId = action.payload;
        },
        setSnackbarMessage: (state, action: PayloadAction<State["snackbarMessage"]>) => {
            state.snackbarMessage = action.payload;
        },
        setOmegaObjectId: (state, action: PayloadAction<State["omegaObjectId"]>) => {
            state.omegaObjectId = action.payload;
        },
    },
});

const { actions, reducer } = omega365Slice;
export { actions as omega365Actions, reducer as omega365Reducer };
