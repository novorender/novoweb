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
    zDown: ReadonlyVec3[];
    zUp: ReadonlyVec3[];
    measurementX?: TraceMeasurement;
    measurementY?: TraceMeasurement;
    measurementZ?: TraceMeasurement;
    laserPlanes?: ReadonlyVec4[];
}

export function getMeasurePointsFromTracer(
    measurement: TraceMeasurement,
    startAr: ReadonlyVec3[],
    endAr: ReadonlyVec3[],
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
    laser3d: false,
    lasers: [] as OutlineLaser[],
    laserPlane: undefined as
        | {
              normalOffset: ReadonlyVec4;
              rotation: number;
          }
        | undefined,
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
                    : group,
            );
        },
        setLaser3d: (state, action: PayloadAction<State["laser3d"]>) => {
            state.laser3d = action.payload;
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
                if (
                    state.lasers[action.payload].measurementX!.startIdx ===
                    state.lasers[action.payload].left.length - 1
                ) {
                    state.lasers[action.payload].measurementX = undefined;
                } else {
                    state.lasers[action.payload].measurementX!.startIdx! += 1;
                }
            }
        },
        incrementLaserRight: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementX &&
                state.lasers[action.payload].measurementX!.endIdx !== undefined
            ) {
                if (
                    state.lasers[action.payload].measurementX!.endIdx ===
                    state.lasers[action.payload].right.length - 1
                ) {
                    state.lasers[action.payload].measurementX = undefined;
                } else {
                    state.lasers[action.payload].measurementX!.endIdx! += 1;
                }
            }
        },
        incrementLaserDown: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementY &&
                state.lasers[action.payload].measurementY!.startIdx !== undefined
            ) {
                if (
                    state.lasers[action.payload].measurementY!.startIdx ===
                    state.lasers[action.payload].down.length - 1
                ) {
                    state.lasers[action.payload].measurementY = undefined;
                } else {
                    state.lasers[action.payload].measurementY!.startIdx! += 1;
                }
            }
        },
        incrementLaserUp: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementY &&
                state.lasers[action.payload].measurementY!.endIdx !== undefined
            ) {
                if (state.lasers[action.payload].measurementY!.endIdx === state.lasers[action.payload].up.length - 1) {
                    state.lasers[action.payload].measurementY = undefined;
                } else {
                    state.lasers[action.payload].measurementY!.endIdx! += 1;
                }
            }
        },
        incrementLaserZDown: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementZ &&
                state.lasers[action.payload].measurementZ!.startIdx !== undefined
            ) {
                if (
                    state.lasers[action.payload].measurementZ!.startIdx ===
                    state.lasers[action.payload].zDown.length - 1
                ) {
                    state.lasers[action.payload].measurementZ = undefined;
                } else {
                    state.lasers[action.payload].measurementZ!.startIdx! += 1;
                }
            }
        },
        incrementLaserZUp: (state, action: PayloadAction<number>) => {
            if (
                state.lasers[action.payload].measurementZ &&
                state.lasers[action.payload].measurementZ!.endIdx !== undefined
            ) {
                if (state.lasers[action.payload].measurementZ!.endIdx === state.lasers[action.payload].zUp.length - 1) {
                    state.lasers[action.payload].measurementZ = undefined;
                } else {
                    state.lasers[action.payload].measurementZ!.endIdx! += 1;
                }
            }
        },
        removeMeasurementX: (state, action: PayloadAction<number>) => {
            delete state.lasers[action.payload].measurementX;
        },
        removeMeasurementY: (state, action: PayloadAction<number>) => {
            delete state.lasers[action.payload].measurementY;
        },
        removeMeasurementZ: (state, action: PayloadAction<number>) => {
            delete state.lasers[action.payload].measurementZ;
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
                    zDown: [],
                    zUp: [],
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
                    measurementZ: t.measurementZ
                        ? {
                              start: t.measurementZ.start,
                              end: t.measurementZ.end,
                          }
                        : undefined,
                    laserPlanes: t.laserPlanes,
                };
            });
        });
    },
});

export const selectOutlineGroups = (state: RootState) => state.clippingOutline.outlineGroups;
export const selectVisibleOutlineGroups = createSelector(selectOutlineGroups, (groups) =>
    groups.filter((group) => !group.hidden),
);
export const selectOutlineLaserPlane = (state: RootState) => state.clippingOutline.laserPlane;
export const selectOutlineLasers = (state: RootState) => state.clippingOutline.lasers;
export const selectOutlineLaser3d = (state: RootState) => state.clippingOutline.laser3d;

const { actions, reducer } = outlineLaserSlice;
export { actions as clippingOutlineLaserActions, reducer as clippingOutlineLaserReducer };
