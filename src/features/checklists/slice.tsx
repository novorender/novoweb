import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    currentChecklist: null,
    lastViewedPath: "/",
} as {
    currentChecklist: string | null;
    lastViewedPath: string;
};

type State = typeof initialState;

export const formsSlice = createSlice({
    name: "forms",
    initialState: initialState,
    reducers: {
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setCurrentChecklist: (state, action: PayloadAction<State["currentChecklist"]>) => {
            state.currentChecklist = action.payload;
        },
    },
});

export const selectLastViewedPath = (state: RootState) => state.forms.lastViewedPath;

export const selectCurrentChecklist = (state: RootState) => state.forms.currentChecklist;

const { actions, reducer } = formsSlice;
export { actions as formsActions, reducer as formsReducer };
