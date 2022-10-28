import { DuoMeasurementValues, ManholeMeasureValues } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { SelectedMeasureObj } from "features/measure";

const initialState = {
    selectedId: undefined as number | undefined,
    measureValues: undefined as ManholeMeasureValues | undefined,
    loadingBrep: false,
    pinned: false,
    duoMeasurementValues: undefined as undefined | DuoMeasurementValues,
    measureAgainst: undefined as SelectedMeasureObj | undefined,
};

type State = typeof initialState;

export const manholeSlice = createSlice({
    name: "manhole",
    initialState: initialState,
    reducers: {
        selectObj: (state, action: PayloadAction<State["selectedId"]>) => {
            state.selectedId = action.payload;
            if (state.selectedId === undefined) {
                state.measureAgainst = undefined;
            }
        },
        setManholeValues: (state, action: PayloadAction<State["measureValues"]>) => {
            state.measureValues = action.payload as any;
        },
        setLoadingBrep: (state, action: PayloadAction<State["loadingBrep"]>) => {
            state.loadingBrep = action.payload;
        },
        setPinned: (state, action: PayloadAction<State["pinned"]>) => {
            state.pinned = action.payload;
        },
        setMeasureManholeAgainst: (state, action: PayloadAction<State["measureAgainst"]>) => {
            state.measureAgainst = action.payload;
        },
        setDuoMeasurementValues: (state, action: PayloadAction<State["duoMeasurementValues"]>) => {
            state.duoMeasurementValues = action.payload;
        },
    },
});

export const selectManholeId = (state: RootState) => state.manhole.selectedId;
export const selectManholeMeasureValues = (state: RootState) => state.manhole.measureValues;
export const selectManholeMeasureAgainst = (state: RootState) => state.manhole.measureAgainst;
export const selectManholeDuoMeasure = (state: RootState) => state.manhole.duoMeasurementValues;
export const selectIsLoadingManholeBrep = (state: RootState) => state.manhole.loadingBrep;
export const selectIsManholePinned = (state: RootState) => state.manhole.pinned;

const { actions, reducer } = manholeSlice;
export { actions as manholeActions, reducer as manholeReducer };
