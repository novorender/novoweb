import { DuoMeasurementValues, MeasureSettings } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

export type SelectedMeasureObj = {
    id: number;
    pos: vec3;
    settings?: MeasureSettings;
};

const initialState = {
    selected: [] as SelectedMeasureObj[],
    forcePoint: false,
    pinned: undefined as undefined | number,
    duoMeasurementValues: undefined as undefined | DuoMeasurementValues,
};

type State = typeof initialState;

export const measureSlice = createSlice({
    name: "measure",
    initialState: initialState,
    reducers: {
        selectObj: (state, action: PayloadAction<SelectedMeasureObj>) => {
            const selectIdx = [1, undefined].includes(state.pinned) ? 0 : 1;
            state.selected[selectIdx] = action.payload;
        },
        setSelected: (state, action: PayloadAction<State["selected"]>) => {
            state.selected = action.payload;
        },
        pin: (state, action: PayloadAction<State["pinned"]>) => {
            state.pinned = action.payload;
        },
        unPin: (state) => {
            state.pinned = undefined;
        },
        clear: (state) => {
            state.selected = [];
            state.pinned = undefined;
        },
        toggleForcePoint: (state) => {
            state.forcePoint = !state.forcePoint;
        },
        setDuoMeasurementValues: (state, action: PayloadAction<State["duoMeasurementValues"]>) => {
            state.duoMeasurementValues = action.payload;
        },
        setSettings: (state, action: PayloadAction<{ idx: number; settings: MeasureSettings }>) => {
            state.selected = state.selected.map((obj, idx) =>
                idx === action.payload.idx ? { ...obj, settings: action.payload.settings } : obj
            );
        },
    },
});

export const selectMeasure = (state: RootState) => state.measure;

const { actions, reducer } = measureSlice;
export { actions as measureActions, reducer as measureReducer };
