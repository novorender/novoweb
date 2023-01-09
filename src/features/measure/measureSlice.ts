import { DuoMeasurementValues, MeasureEntity, MeasureSettings } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { DeepWritable } from "slices/renderSlice";

export type SelectedMeasureObj = {
    id: number;
    pos: vec3;
    settings?: MeasureSettings;
};

type WriteableMeasureEntity = DeepWritable<MeasureEntity>;

export type ExtendedMeasureEntity = MeasureEntity & {
    settings?: MeasureSettings;
};

type WriteableExtendedMeasureEntity = DeepWritable<ExtendedMeasureEntity>;

const initialState = {
    selected: [] as SelectedMeasureObj[],
    selectedEntity: [] as WriteableExtendedMeasureEntity[],
    hover: undefined as WriteableMeasureEntity | undefined,
    pickSettings: "all" as "all" | "point" | "curve" | "surface",
    forcePoint: false,
    pinned: undefined as undefined | number,
    duoMeasurementValues: undefined as undefined | DuoMeasurementValues,
    loadingBrep: false,
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
        selectEntity: (state, action: PayloadAction<ExtendedMeasureEntity>) => {
            const selectIdx = [1, undefined].includes(state.pinned) ? 0 : 1;
            state.selectedEntity[selectIdx] = action.payload as WriteableExtendedMeasureEntity;
        },
        selectHoverObj: (state, action: PayloadAction<MeasureEntity | undefined>) => {
            state.hover = action.payload as WriteableMeasureEntity | undefined;
        },
        selectPickSettings: (state, action: PayloadAction<"all" | "point" | "curve" | "surface">) => {
            state.pickSettings = action.payload;
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
            state.selectedEntity = [];
            state.pinned = undefined;
        },
        toggleForcePoint: (state) => {
            state.forcePoint = !state.forcePoint;
        },
        setDuoMeasurementValues: (state, action: PayloadAction<State["duoMeasurementValues"]>) => {
            state.duoMeasurementValues = action.payload;
        },
        setSettings: (state, action: PayloadAction<{ idx: number; settings: MeasureSettings }>) => {
            state.selectedEntity = state.selectedEntity.map((obj, idx) =>
                idx === action.payload.idx ? { ...obj, settings: action.payload.settings } : obj
            );
        },
        setLoadingBrep: (state, action: PayloadAction<State["loadingBrep"]>) => {
            state.loadingBrep = action.payload;
        },
    },
});

export const selectMeasure = (state: RootState) => state.measure;

const { actions, reducer } = measureSlice;
export { actions as measureActions, reducer as measureReducer };
