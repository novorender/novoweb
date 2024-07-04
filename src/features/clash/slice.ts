import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type Clash } from "./types";

const initialState = {
    selectedClash: null as Clash | null,
};

type State = typeof initialState;

export const clashSlice = createSlice({
    name: "clash",
    initialState: initialState,
    reducers: {
        setSelectedClash: (state, action: PayloadAction<State["selectedClash"]>) => {
            state.selectedClash = action.payload;
        },
    },
});

const { actions, reducer } = clashSlice;
export { actions as clashActions, reducer as clashReducer };
