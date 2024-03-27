import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ReadonlyVec3, ReadonlyVec4 } from "gl-matrix";

import { type RootState } from "app";
import { selectBookmark } from "features/render";
import { VecRGB } from "utils/color";

export interface OutlineGroup {
    name: string;
    color: VecRGB;
    hidden: boolean;
    ids: number[];
}

export interface TraceMeasurement {
    start?: ReadonlyVec3;
    end?: ReadonlyVec3;
    startIdx?: number;
    endIdx?: number;
}

export interface OutlineLaser {
    laserPosition: ReadonlyVec3;
    left: ReadonlyVec3[];
    right: ReadonlyVec3[];
    down: ReadonlyVec3[];
    up: ReadonlyVec3[];
    measurementX?: TraceMeasurement;
    measurementY?: TraceMeasurement;
}

export function getMeasurePointsFromTracer(
    measurement: TraceMeasurement,
    startAr: ReadonlyVec3[],
    endAr: ReadonlyVec3[]
) {
    if (measurement.start && measurement.end) {
        return [measurement.start, measurement.end];
    }
    if (
        measurement.startIdx !== undefined &&
        measurement.startIdx < startAr.length &&
        measurement.endIdx !== undefined &&
        measurement.endIdx < endAr.length
    ) {
        return [startAr[measurement.startIdx], endAr[measurement.endIdx]];
    }
    return undefined;
}

const initialState = {
    outlineGroups: [] as OutlineGroup[],
    lasers: [] as OutlineLaser[],
    laserPlane: undefined as ReadonlyVec4 | undefined,
};

type State = typeof initialState;

export const outlineLaserSlice = createSlice({
    name: "outlineLaser",
    initialState: initialState,
    reducers: {
        setOutlineGroups: (state, action: PayloadAction<State["outlineGroups"]>) => {
            state.outlineGroups = action.payload;
        },
        toggleHideOutlineGroup: (state, action: PayloadAction<{ name: OutlineGroup["name"]; hide?: boolean }>) => {
            state.outlineGroups = state.outlineGroups.map((group) =>
                group.name === action.payload.name
                    ? { ...group, hidden: action.payload.hide === undefined ? !group.hidden : action.payload.hide }
                    : group
            );
        },
        setLaserPlane: (state, action: PayloadAction<State["laserPlane"]>) => {
            state.laserPlane = action.payload;
        },
        addLaser: (state, action: PayloadAction<OutlineLaser>) => {
            state.lasers = state.lasers.concat([action.payload]);
        },
        setLasers: (state, action: PayloadAction<State["lasers"]>) => {
            state.lasers = action.payload;
        },
        setLaser: (state, action: PayloadAction<{ idx: number; trace: OutlineLaser }>) => {
            state.lasers[action.payload.idx] = action.payload.trace;
        },
        clear: (state) => {
            state.lasers = [];
        },
        incrementLaserLeft: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementX &&
                state.lasers[action.payload].measurementX!.startIdx !== undefined
            ) {
                state.lasers[action.payload].measurementX!.startIdx === state.lasers[action.payload].left.length - 1
                    ? (state.lasers[action.payload].measurementX = undefined)
                    : (state.lasers[action.payload].measurementX!.startIdx! += 1);
            }
        },
        incrementLaserRight: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementX &&
                state.lasers[action.payload].measurementX!.endIdx !== undefined
            ) {
                state.lasers[action.payload].measurementX!.endIdx === state.lasers[action.payload].right.length - 1
                    ? (state.lasers[action.payload].measurementX = undefined)
                    : (state.lasers[action.payload].measurementX!.endIdx! += 1);
            }
        },
        incrementLaserDown: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementY &&
                state.lasers[action.payload].measurementY!.startIdx !== undefined
            ) {
                state.lasers[action.payload].measurementY!.startIdx === state.lasers[action.payload].down.length - 1
                    ? (state.lasers[action.payload].measurementY = undefined)
                    : (state.lasers[action.payload].measurementY!.startIdx! += 1);
            }
        },
        incrementLaserUp: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementY &&
                state.lasers[action.payload].measurementY!.endIdx !== undefined
            ) {
                state.lasers[action.payload].measurementY!.endIdx === state.lasers[action.payload].up.length - 1
                    ? (state.lasers[action.payload].measurementY = undefined)
                    : (state.lasers[action.payload].measurementY!.endIdx! += 1);
            }
        },
        removeMeasurementX: (state, action: PayloadAction<number>) => {
            state.lasers[action.payload].measurementX = undefined;
        },
        removeMeasurementY: (state, action: PayloadAction<number>) => {
            state.lasers[action.payload].measurementY = undefined;
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            const { outlineMeasure } = action.payload;

            if (!outlineMeasure) {
                return;
            }

            state.laserPlane = outlineMeasure.laserPlane;
            state.lasers = outlineMeasure.lasers.map((t) => {
                return {
                    laserPosition: t.laserPosition,
                    left: [],
                    right: [],
                    down: [],
                    up: [],
                    measurementX: t.measurementX
                        ? {
                              start: t.measurementX.start,
                              end: t.measurementX.end,
                          }
                        : undefined,
                    measurementY: t.measurementY
                        ? {
                              start: t.measurementY.start,
                              end: t.measurementY.end,
                          }
                        : undefined,
                };
            });
        });
    },
});

export const selectOutlineGroups = (state: RootState) => state.clippingOutline.outlineGroups;
export const selectVisibleOutlineGroups = createSelector(selectOutlineGroups, (groups) =>
    groups.filter((group) => !group.hidden)
);
export const selectOutlineLaserPlane = (state: RootState) => state.clippingOutline.laserPlane;
export const selectOutlineLasers = (state: RootState) => state.clippingOutline.lasers;

const { actions, reducer } = outlineLaserSlice;
export { actions as clippingOutlineLaserActions, reducer as clippingOutlineLaserReducer };
