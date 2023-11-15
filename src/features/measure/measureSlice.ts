import { DuoMeasurementValues, MeasureEntity, MeasureSettings } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { DeepMutable, resetView, selectBookmark } from "features/render/renderSlice";
import { ExtendedMeasureEntity } from "types/misc";

import { SnapKind } from "./config";

export type SelectedMeasureObj = {
    id: number;
    pos: vec3;
    settings?: MeasureSettings;
};

type WriteableMeasureEntity = DeepMutable<MeasureEntity>;
type WriteableExtendedMeasureEntity = DeepMutable<ExtendedMeasureEntity>;

const initialState = {
    selectedEntities: [[]] as WriteableExtendedMeasureEntity[][],
    hover: undefined as WriteableMeasureEntity | undefined,
    snapKind: "all" as SnapKind,
    pinned: undefined as undefined | number,
    duoMeasurementValues: [] as (undefined | { result: DuoMeasurementValues; id: number })[],
    loadingBrep: false,
};

type State = typeof initialState;

function isLegacy(
    measureSet: WriteableExtendedMeasureEntity[] | WriteableExtendedMeasureEntity[][]
): measureSet is WriteableExtendedMeasureEntity[] {
    return measureSet.length > 0 && !Array.isArray(measureSet[0]);
}

export const measureSlice = createSlice({
    name: "measure",
    initialState: initialState,
    reducers: {
        newMeasurement: (state) => {
            state.selectedEntities.push([]);
            state.pinned = undefined;
        },
        selectEntity: (state, action: PayloadAction<{ entity: ExtendedMeasureEntity; pin?: boolean }>) => {
            const selectIdx = [1, undefined].includes(state.pinned) ? 0 : 1;

            const currentEntities = state.selectedEntities[state.selectedEntities.length - 1];
            currentEntities[selectIdx] = action.payload.entity as WriteableExtendedMeasureEntity;
            if (action.payload.pin) {
                state.pinned = selectIdx;
            }

            state.selectedEntities = state.selectedEntities
                .slice(0, state.selectedEntities.length - 1)
                .concat([currentEntities]);
        },
        selectHoverObj: (state, action: PayloadAction<MeasureEntity | undefined>) => {
            state.hover = action.payload as WriteableMeasureEntity | undefined;
        },
        selectPickSettings: (state, action: PayloadAction<SnapKind>) => {
            state.snapKind = action.payload;
        },
        //Legacy
        setSelectedEntities: (state, action: PayloadAction<ExtendedMeasureEntity[]>) => {
            state.selectedEntities = [action.payload as WriteableExtendedMeasureEntity[]];
        },

        addMeasureEntites: (state, action: PayloadAction<ExtendedMeasureEntity[]>) => {
            state.selectedEntities.push(action.payload as WriteableExtendedMeasureEntity[]);
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
        setDuoMeasurementValues: (
            state,
            action: PayloadAction<(undefined | { result: DuoMeasurementValues; id: number })[]>
        ) => {
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
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            if (isLegacy(state.selectedEntities)) {
                state.selectedEntities.push(
                    action.payload.measurements.measure.entities as WriteableExtendedMeasureEntity[]
                );
            } else if (state.selectedEntities.length > 0) {
                state.selectedEntities = action.payload.measurements.measure
                    .entities as WriteableExtendedMeasureEntity[][];
            }
        });
        builder.addCase(resetView, (state) => {
            state.selectedEntities = [];
            state.selectedEntities.push([]);
        });
    },
});

export const selectMeasure = (state: RootState) =>
    state.measure as Omit<State, "selectedEntities" | "hover"> & {
        selectedEntities: ExtendedMeasureEntity[][];
        hover: ExtendedMeasureEntity | undefined;
    };
export const selectMeasureEntities = (state: RootState) => state.measure.selectedEntities as ExtendedMeasureEntity[][];

const { actions, reducer } = measureSlice;
export { actions as measureActions, reducer as measureReducer };
