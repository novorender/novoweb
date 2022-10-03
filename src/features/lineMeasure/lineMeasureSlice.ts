import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    points: [] as vec3[],
    length: 0,
};

type State = typeof initialState;

export const lineMeasureSlice = createSlice({
    name: "lineMeasure",
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

export const selectlineMeasurePoints = (state: RootState) => state.lineMeasure.points;
export const selectLineMeasureLength = (state: RootState) => state.lineMeasure.length;

const { actions, reducer } = lineMeasureSlice;
export { actions as lineMeasureActions, reducer as lineMeasureReducer };
