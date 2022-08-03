import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    // todo
    lastViewedPath: "/new",
};

type State = typeof initialState;

export const checklistsSlice = createSlice({
    name: "checklists",
    initialState: initialState,
    reducers: {
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
    },
});

export const selectLastViewedPath = (state: RootState) => state.checklists.lastViewedPath;

const { actions, reducer } = checklistsSlice;
export { actions as checklistsActions, reducer as checklistsReducer };
