import { LineStripMeasureValues } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { resetView, selectBookmark } from "features/render";

export type PointLine = {
    points: vec3[];
    result: undefined | LineStripMeasureValues;
};

const initialState = {
    pointLines: [
        {
            points: [],
            result: undefined,
        },
    ] as PointLine[],

    currentIndex: 0 as number,
    bookmarkPoints: [[]] as vec3[][],
    lockElevation: false,
};

export const pointLineSlice = createSlice({
    name: "pointLine",
    initialState: initialState,
    reducers: {
        setPoints: (state, action: PayloadAction<vec3[]>) => {
            state.pointLines[state.currentIndex].points = action.payload;
        },
        setResult: (state, action: PayloadAction<LineStripMeasureValues | undefined>) => {
            state.pointLines[state.currentIndex].result = action.payload;
        },
        addPoint: (state, action: PayloadAction<vec3>) => {
            if (state.lockElevation && state.pointLines[state.currentIndex].points.length) {
                const prevPoint = state.pointLines[state.currentIndex].points.slice(-1)[0];
                state.pointLines[state.currentIndex].points = state.pointLines[state.currentIndex].points.concat([
                    [action.payload[0], action.payload[1], prevPoint[2]],
                ]);
            } else {
                state.pointLines[state.currentIndex].points = state.pointLines[state.currentIndex].points.concat([
                    action.payload,
                ]);
            }
        },
        undoPoint: (state) => {
            state.pointLines[state.currentIndex].points = state.pointLines[state.currentIndex].points.slice(
                0,
                state.pointLines[state.currentIndex].points.length - 1
            );
        },
        toggleLockElevation: (state) => {
            state.lockElevation = !state.lockElevation;
        },
        newPointLine: (state) => {
            if (state.pointLines[state.pointLines.length - 1].points.length) {
                state.pointLines.push({
                    points: [],
                    result: undefined,
                });
                state.currentIndex = state.pointLines.length - 1;
            }
        },
        deletePointline: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
            if (state.pointLines.length > 1) {
                state.pointLines.splice(action.payload, 1);
            } else {
                state.pointLines = [
                    {
                        points: [],
                        result: undefined,
                    },
                ];
            }
            state.currentIndex = state.pointLines.length - 1;
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            if (action.payload.measurements.pointLine.points) {
                state.pointLines[0] = { points: action.payload.measurements.pointLine.points, result: undefined };
            } else {
                state.bookmarkPoints = action.payload.measurements.pointLine.pointLines;
            }
        });
        builder.addCase(resetView, (state) => {
            state.pointLines = [
                {
                    points: [],
                    result: undefined,
                },
            ];
            state.currentIndex = 0;
        });
    },
});

export const selectPointLines = (state: RootState) => state.pointLine.pointLines;
export const selectPointLine = (state: RootState) => state.pointLine.pointLines[state.pointLine.currentIndex];
export const selectPointLinePoints = (state: RootState) =>
    state.pointLine.pointLines[state.pointLine.currentIndex].points;
export const selectLockElevation = (state: RootState) => state.pointLine.lockElevation;
export const selectPointLineCurrent = (state: RootState) => state.pointLine.currentIndex;
export const selectPointLineBookmarkPoints = (state: RootState) => state.pointLine.bookmarkPoints;

const { actions, reducer } = pointLineSlice;
export { actions as pointLineActions, reducer as pointLineReducer };
