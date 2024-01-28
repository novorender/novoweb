import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    currentChecklist: null,
    lastViewedPath: "/",
    filters: {
        name: "",
        new: true,
        ongoing: true,
        finished: true,
    },
} as {
    currentChecklist: string | null;
    lastViewedPath: string;
    filters: {
        name: string;
        new: boolean;
        ongoing: boolean;
        finished: boolean;
    };
};

type State = typeof initialState;
export type Filters = State["filters"];

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
        setFilters: (state, action: PayloadAction<Partial<State["filters"]>>) => {
            state.filters = {
                ...state.filters,
                ...action.payload,
            };
        },
        resetFilters: (state) => {
            state.filters = initialState.filters;
        },
        toggleFilter: (state, action: PayloadAction<Exclude<keyof State["filters"], "name">>) => {
            state.filters[action.payload] = !state.filters[action.payload];
        },
    },
});

export const selectLastViewedPath = (state: RootState) => state.forms.lastViewedPath;

export const selectCurrentChecklist = (state: RootState) => state.forms.currentChecklist;

export const selectFilters = (state: RootState) => state.forms.filters;

const { actions, reducer } = formsSlice;
export { actions as formsActions, reducer as formsReducer };
