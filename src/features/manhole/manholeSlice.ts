import { ManholeMeasureValues } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    selectedId: undefined as number | undefined,
    measureValues: undefined as ManholeMeasureValues | undefined,
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
    },
});

export const selectManholeId = (state: RootState) => state.manhole.selectedId;
export const selectManhole = (state: RootState) => state.manhole.measureValues;

const { actions, reducer } = manholeSlice;
export { actions as manholeActions, reducer as manholeReducer };
