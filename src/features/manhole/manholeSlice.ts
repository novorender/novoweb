import { ManholeMeasureValues } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    selectedId: undefined as number | undefined,
    measureValues: undefined as ManholeMeasureValues | undefined,
    loadingBrep: false,
};

type State = typeof initialState;

export const manholeSlice = createSlice({
    name: "manhole",
    initialState: initialState,
    reducers: {
        selectObj: (state, action: PayloadAction<State["selectedId"]>) => {
            state.selectedId = action.payload;
        },
        setManholeValues: (state, action: PayloadAction<State["measureValues"]>) => {
            state.measureValues = action.payload;
        },
        setLoadingBrep: (state, action: PayloadAction<State["loadingBrep"]>) => {
            state.loadingBrep = action.payload;
        },
    },
});

export const selectManholeId = (state: RootState) => state.manhole.selectedId;
export const selectManholeMeasureValues = (state: RootState) => state.manhole.measureValues;
export const selectIsLoadingManholeBrep = (state: RootState) => state.manhole.loadingBrep;

const { actions, reducer } = manholeSlice;
export { actions as manholeActions, reducer as manholeReducer };
