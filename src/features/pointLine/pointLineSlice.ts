import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    points: [] as vec3[],
    length: 0,
};

type State = typeof initialState;

export const pointLineSlice = createSlice({
    name: "pointLine",
    initialState: initialState,
    reducers: {
        setPoints: (state, action: PayloadAction<State["points"]>) => {
            state.points = action.payload;
        },
        setLength: (state, action: PayloadAction<State["length"]>) => {
            state.length = action.payload;
        },
        addPoint: (state, action: PayloadAction<vec3>) => {
            state.points = state.points.concat([action.payload]);
        },
        undoPoint: (state) => {
            state.points = state.points.slice(0, state.points.length - 1);
        },
    },
});

export const selectPointLinePoints = (state: RootState) => state.pointLine.points;
export const selectPointLineLength = (state: RootState) => state.pointLine.length;

const { actions, reducer } = pointLineSlice;
export { actions as pointLineActions, reducer as pointLineReducer };
