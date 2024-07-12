import { DuoMeasurementValues, MeasureEntity, MeasureSettings } from "@novorender/api";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { type RootState } from "app";
import { DeepMutable, resetView, selectBookmark } from "features/render";
import { ExtendedMeasureEntity } from "types/misc";

import { SnapKind } from "./config";

export type SelectedMeasureObj = {
    id: number;
    pos: vec3;
    settings?: MeasureSettings;
};

type MutableMeasureEntity = DeepMutable<MeasureEntity>;
type MutableExtendedMeasureEntity = DeepMutable<ExtendedMeasureEntity>;

export type ActiveAxis = {
    x: boolean;
    y: boolean;
    z: boolean;
    planar: boolean;
    result: boolean;
    normal: boolean;
};

const initialState = {
    selectedEntities: [[]] as MutableExtendedMeasureEntity[][],
    hover: undefined as MutableMeasureEntity | undefined,
    snapKind: "all" as SnapKind,
    pinned: undefined as undefined | number,
    duoMeasurementValues: [] as (
        | undefined
        | {
              result: DuoMeasurementValues;
              id: number;
              settings?: MeasureSettings;
          }
    )[],
    activeAxis: [] as (ActiveAxis | undefined)[],
    loadingBrep: false,
    currentIndex: 0 as number,
};

type State = typeof initialState;

function isLegacy(
    measureSet: MutableExtendedMeasureEntity[] | MutableExtendedMeasureEntity[][]
): measureSet is MutableExtendedMeasureEntity[] {
    return measureSet.length > 0 && !Array.isArray(measureSet[0]);
}

export const measureSlice = createSlice({
    name: "measure",
    initialState: initialState,
    reducers: {
        newMeasurement: (state) => {
            const entities = state.selectedEntities.at(-1);
            if (entities && entities.length > 0) {
                if (entities.length > 1 || entities[0].drawKind !== "vertex") {
                    state.selectedEntities.push([]);
                }
            }
            state.pinned = undefined;
            state.currentIndex = state.selectedEntities.length - 1;
        },
        selectEntity: (state, action: PayloadAction<{ entity: ExtendedMeasureEntity; pin?: boolean }>) => {
            state.hover = undefined;
            const selectIdx = [1, undefined].includes(state.pinned) ? 0 : 1;

            const currentEntities = state.selectedEntities[state.currentIndex];
            const planeMeasure = action.payload.entity?.settings?.planeMeasure;
            state.activeAxis[state.currentIndex] = {
                x: true,
                y: true,
                z: planeMeasure ? false : true,
                planar: planeMeasure ? false : true,
                result: true,
                normal: true,
            };
            currentEntities[selectIdx] = action.payload.entity as MutableExtendedMeasureEntity;
            if (action.payload.pin) {
                state.pinned = selectIdx;
            }

            state.selectedEntities[state.currentIndex] = currentEntities;
        },
        selectMeasureSet: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
        },
        deleteMeasureSet: (state, action: PayloadAction<number>) => {
            if (state.selectedEntities.length > 1) {
                state.selectedEntities.splice(action.payload, 1);
                state.duoMeasurementValues.splice(action.payload, 1);
                state.activeAxis.splice(action.payload, 1);
            } else {
                state.selectedEntities = [[]];
                state.activeAxis = [];
                state.duoMeasurementValues = [];
            }
            state.currentIndex = state.selectedEntities.length - 1;
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
                        res.result = false;
                        break;
                    case "plan":
                        res.planar = false;
                        break;
                    case "normal":
                        res.normal = false;
                        break;
                }
                if (
                    (res.x === false &&
                        res.y === false &&
                        res.z === false &&
                        res.result === false &&
                        res.planar === false) ||
                    res.normal === false
                ) {
                    if (state.selectedEntities.length > 1) {
                        state.selectedEntities.splice(action.payload.idx, 1);
                        state.duoMeasurementValues.splice(action.payload.idx, 1);
                        state.activeAxis.splice(action.payload.idx, 1);
                    } else {
                        state.selectedEntities = [[]];
                        state.activeAxis = [];
                        state.duoMeasurementValues = [];
                    }
                    state.pinned = undefined;
                    state.currentIndex = state.selectedEntities.length - 1;
                } else {
                    state.activeAxis[action.payload.idx] = res;
                }
            }
        },
        selectHoverObj: (state, action: PayloadAction<MeasureEntity | undefined>) => {
            state.hover = action.payload as MutableMeasureEntity | undefined;
        },
        selectPickSettings: (state, action: PayloadAction<SnapKind>) => {
            state.snapKind = action.payload;
        },
        //Legacy
        setSelectedEntities: (state, action: PayloadAction<ExtendedMeasureEntity[]>) => {
            state.selectedEntities = [action.payload as MutableExtendedMeasureEntity[]];
        },

        addMeasureEntites: (state, action: PayloadAction<ExtendedMeasureEntity[]>) => {
            state.selectedEntities.push(action.payload as MutableExtendedMeasureEntity[]);
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
            state.currentIndex = 0;
        },
        setDuoMeasurementValues: (
            state,
            action: PayloadAction<
                (undefined | { result: DuoMeasurementValues; id: number; settings?: MeasureSettings })[]
            >
        ) => {
            state.duoMeasurementValues = action.payload;
            for (let i = state.activeAxis.length; i < state.duoMeasurementValues.length; ++i) {
                const planeMeasure = state.duoMeasurementValues[i]?.settings?.planeMeasure;
                state.activeAxis.push({
                    x: true,
                    y: true,
                    z: planeMeasure ? false : true,
                    planar: planeMeasure ? false : true,
                    result: true,
                    normal: true,
                });
            }
        },
        setSettings: (state, action: PayloadAction<{ idx: number; settings: MeasureSettings }>) => {
            state.selectedEntities[state.currentIndex] = state.selectedEntities[state.currentIndex].map((obj, idx) =>
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
                    action.payload.measurements.measure.entities as MutableExtendedMeasureEntity[]
                );
            } else if (action.payload.measurements.measure.entities.length > 0) {
                state.selectedEntities = action.payload.measurements.measure
                    .entities as MutableExtendedMeasureEntity[][];
            }
            if (action.payload.measurements.measure.activeAxis) {
                state.activeAxis = action.payload.measurements.measure.activeAxis;
            }
        });
        builder.addCase(resetView, (state) => {
            state.selectedEntities = [[]];
            state.pinned = undefined;
            state.hover = undefined;
            state.currentIndex = 0;
        });
    },
});

export const selectMeasure = (state: RootState) =>
    state.measure as Omit<State, "selectedEntities" | "hover"> & {
        selectedEntities: ExtendedMeasureEntity[][];
        hover: ExtendedMeasureEntity | undefined;
    };
export const selectHoveredMeasureEntity = (state: RootState) => state.measure.hover;
export const selectMeasureEntities = (state: RootState) => state.measure.selectedEntities as ExtendedMeasureEntity[][];

// Base tolerance for default snap is point=0.015.
// For particular snap kinds - just multiply point by ~2-3 (???)
// How we came up with that:
// 1. Select a point with measure tool
// 2. Move camera close to this point so you're ~1m away from it
// 3. Use line measure tool to define your tolerance radius
export const selectMeasureHoverSettings = createSelector(
    (state: RootState) => state.measure.snapKind,
    (snapKind) => {
        switch (snapKind) {
            case "point":
                return { point: 0.03 };
            case "curve":
                return { edge: 0.03, segment: 0.02 };
            case "surface":
                return { face: 0.03 };
            default:
                return { edge: 0.008, segment: 0.008, face: 0.015, point: 0.015 };
        }
    }
);
export const selectMeasurePickSettings = createSelector(
    (state: RootState) => state.measure.snapKind,
    (snapKind) => {
        switch (snapKind) {
            case "point":
                return { point: 0.03 };
            case "curve":
                return { edge: 0.03, segment: 0.02 };
            case "surface":
                return { face: 0.03 };
            default:
                return { edge: 0.008, segment: 0.008, face: 0.015, point: 0.015 };
        }
    }
);

const { actions, reducer } = measureSlice;
export { actions as measureActions, reducer as measureReducer };
