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

export type ActiveAxis = {
    x: boolean;
    y: boolean;
    z: boolean;
    plan: boolean;
    dist: boolean;
    normal: boolean;
};

const initialState = {
    selectedEntities: [[]] as WriteableExtendedMeasureEntity[][],
    hover: undefined as WriteableMeasureEntity | undefined,
    snapKind: "all" as SnapKind,
    pinned: undefined as undefined | number,
    duoMeasurementValues: [] as (
        | undefined
        | {
              result: DuoMeasurementValues;
              id: number;
          }
    )[],
    activeAxis: [] as (ActiveAxis | undefined)[],
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
        deleteMeasureSet: (state, action: PayloadAction<number>) => {
            if (state.selectedEntities.length > 1) {
                state.selectedEntities = state.selectedEntities.splice(action.payload - 1, 1);
                state.duoMeasurementValues = state.duoMeasurementValues.splice(action.payload - 1, 1);
                state.activeAxis = state.activeAxis.splice(action.payload - 1, 1);
            } else {
                state.selectedEntities = [[]];
                state.activeAxis = [];
                state.duoMeasurementValues = [];
            }
            state.pinned = undefined;
        },
        removeAxis: (
            state,
            action: PayloadAction<{ axis: "x" | "y" | "z" | "dist" | "plan" | "normal"; idx: number }>
        ) => {
            const res = state.activeAxis[action.payload.idx];
            if (res) {
                switch (action.payload.axis) {
                    case "x":
                        res.x = false;
                        break;
                    case "y":
                        res.y = false;
                        break;
                    case "z":
                        res.z = false;
                        break;
                    case "dist":
                        res.dist = false;
                        break;
                    case "plan":
                        res.plan = false;
                        break;
                    case "normal":
                        res.normal = false;
                        break;
                }
                if (
                    (res.x === false &&
                        res.y === false &&
                        res.z === false &&
                        res.dist === false &&
                        res.plan === false) ||
                    res.normal === false
                ) {
                    if (state.selectedEntities.length > 1) {
                        state.selectedEntities = state.selectedEntities.splice(action.payload.idx - 1, 1);
                        state.duoMeasurementValues = state.duoMeasurementValues.splice(action.payload.idx - 1, 1);
                        state.activeAxis = state.activeAxis.splice(action.payload.idx - 1, 1);
                    } else {
                        state.selectedEntities = [[]];
                        state.activeAxis = [];
                        state.duoMeasurementValues = [];
                    }
                    state.pinned = undefined;
                } else {
                    state.activeAxis[action.payload.idx] = res;
                }
            }
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
            state.selectedEntities = [[]];
            state.pinned = undefined;
            state.hover = undefined;
        },
        setDuoMeasurementValues: (
            state,
            action: PayloadAction<(undefined | { result: DuoMeasurementValues; id: number })[]>
        ) => {
            state.duoMeasurementValues = action.payload;
            for (let i = state.activeAxis.length; i < state.duoMeasurementValues.length; ++i) {
                state.activeAxis.push({
                    x: true,
                    y: true,
                    z: true,
                    plan: true,
                    dist: true,
                    normal: true,
                });
            }
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
            if (isLegacy(action.payload.measurements.measure.entities)) {
                state.selectedEntities.push(
                    action.payload.measurements.measure.entities as WriteableExtendedMeasureEntity[]
                );
            } else if (action.payload.measurements.measure.entities.length > 0) {
                state.selectedEntities = action.payload.measurements.measure
                    .entities as WriteableExtendedMeasureEntity[][];
            }
            if (action.payload.measurements.measure.activeAxis) {
                state.activeAxis = action.payload.measurements.measure.activeAxis;
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
