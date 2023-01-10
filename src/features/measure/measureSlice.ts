import { DuoMeasurementValues, MeasureEntity, MeasureSettings } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { DeepWritable } from "slices/renderSlice";
import { ExtendedMeasureEntity } from "types/misc";
import { SnapKind } from "./config";

export type SelectedMeasureObj = {
    id: number;
    pos: vec3;
    settings?: MeasureSettings;
};

type WriteableMeasureEntity = DeepWritable<MeasureEntity>;
type WriteableExtendedMeasureEntity = DeepWritable<ExtendedMeasureEntity>;

const initialState = {
    selectedEntities: [] as WriteableExtendedMeasureEntity[],
    hover: undefined as WriteableMeasureEntity | undefined,
    snapKind: "all" as SnapKind,
    pinned: undefined as undefined | number,
    duoMeasurementValues: undefined as undefined | DuoMeasurementValues,
    loadingBrep: false,
};

type State = typeof initialState;

export const measureSlice = createSlice({
    name: "measure",
    initialState: initialState,
    reducers: {
        selectEntity: (state, action: PayloadAction<ExtendedMeasureEntity>) => {
            const selectIdx = [1, undefined].includes(state.pinned) ? 0 : 1;
            state.selectedEntities[selectIdx] = action.payload as WriteableExtendedMeasureEntity;
        },
        selectHoverObj: (state, action: PayloadAction<MeasureEntity | undefined>) => {
            state.hover = action.payload as WriteableMeasureEntity | undefined;
        },
        selectPickSettings: (state, action: PayloadAction<SnapKind>) => {
            state.snapKind = action.payload;
        },
        setSelectedEntities: (state, action: PayloadAction<ExtendedMeasureEntity[]>) => {
            state.selectedEntities = action.payload as WriteableExtendedMeasureEntity[];
        },
        pin: (state, action: PayloadAction<State["pinned"]>) => {
            state.pinned = action.payload;
        },
        unPin: (state) => {
            state.pinned = undefined;
        },
        clear: (state) => {
            state.selectedEntities = [];
            state.pinned = undefined;
            state.hover = undefined;
        },
        setDuoMeasurementValues: (state, action: PayloadAction<State["duoMeasurementValues"]>) => {
            state.duoMeasurementValues = action.payload;
        },
        setSettings: (state, action: PayloadAction<{ idx: number; settings: MeasureSettings }>) => {
            state.selectedEntities = state.selectedEntities.map((obj, idx) =>
                idx === action.payload.idx ? { ...obj, settings: action.payload.settings } : obj
            );
        },
        setLoadingBrep: (state, action: PayloadAction<State["loadingBrep"]>) => {
            state.loadingBrep = action.payload;
        },
    },
});

export const selectMeasure = (state: RootState) =>
    state.measure as Omit<State, "selectedEntities" | "hover"> & {
        selectedEntities: ExtendedMeasureEntity[];
        hover: ExtendedMeasureEntity | undefined;
    };

const { actions, reducer } = measureSlice;
export { actions as measureActions, reducer as measureReducer };
