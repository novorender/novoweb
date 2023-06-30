import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { resetView, selectBookmark } from "features/render";

const initialState = {
    points: [] as [point: vec3, normal: vec3][],
    drawPoints: [] as vec3[],
    area: -1,
};

type State = typeof initialState;

export const areaSlice = createSlice({
    name: "area",
    initialState: initialState,
    reducers: {
        setDrawPoints: (state, action: PayloadAction<State["drawPoints"]>) => {
            state.drawPoints = action.payload;
        },
        setPoints: (state, action: PayloadAction<State["points"]>) => {
            state.points = action.payload;
        },
        setArea: (state, action: PayloadAction<State["area"]>) => {
            state.area = action.payload;
        },
        addPoint: (state, action: PayloadAction<[vec3, vec3]>) => {
            state.points = state.points.concat([action.payload]);
        },
        undoPoint: (state) => {
            state.points = state.points.slice(0, state.points.length - 1);
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            state.points = action.payload.measurements.area.points;
        });
        builder.addCase(resetView, (state) => {
            state.points = [];
        });
    },
});

export const selectAreaPoints = (state: RootState) => state.area.points;
export const selectAreaDrawPoints = (state: RootState) => state.area.drawPoints;
export const selectArea = (state: RootState) => state.area.area;

const { actions, reducer } = areaSlice;
export { actions as areaActions, reducer as areaReducer };
