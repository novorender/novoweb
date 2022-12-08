import { LineStripMeasureValues } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    points: [] as vec3[],
    result: undefined as undefined | LineStripMeasureValues,
    lockElevation: false,
};

type State = typeof initialState;

export const pointLineSlice = createSlice({
    name: "pointLine",
    initialState: initialState,
    reducers: {
        setPoints: (state, action: PayloadAction<State["points"]>) => {
            state.points = action.payload;
        },
        setResult: (state, action: PayloadAction<State["result"]>) => {
            state.result = action.payload as any;
        },
        addPoint: (state, action: PayloadAction<vec3>) => {
            if (state.lockElevation && state.points.length) {
                const prevPoint = state.points.slice(-1)[0];
                state.points = state.points.concat([[action.payload[0], prevPoint[1], action.payload[2]]]);
            } else {
                state.points = state.points.concat([action.payload]);
            }
        },
        undoPoint: (state) => {
            state.points = state.points.slice(0, state.points.length - 1);
        },
        toggleLockElevation: (state) => {
            state.lockElevation = !state.lockElevation;
        },
    },
});

export const selectPointLine = (state: RootState) => state.pointLine;
export const selectPointLinePoints = (state: RootState) => state.pointLine.points;

const { actions, reducer } = pointLineSlice;
export { actions as pointLineActions, reducer as pointLineReducer };
