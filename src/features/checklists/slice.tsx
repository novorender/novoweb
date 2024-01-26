import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    lastViewedPath: "/",
};

type State = typeof initialState;

export const formsSlice = createSlice({
    name: "forms",
    initialState: initialState,
    reducers: {
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
    },
});

export const selectLastViewedPath = (state: RootState) => state.forms.lastViewedPath;

const { actions, reducer } = formsSlice;
export { actions as formsActions, reducer as formsReducer };
