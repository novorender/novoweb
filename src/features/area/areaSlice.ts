import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { resetView, selectBookmark } from "features/render";

export type AreaMeasure = {
    points: vec3[];
    normals: vec3[];
    drawPoints: vec3[];
    area: number;
};

const initialState = {
    areaList: [
        {
            points: [],
            normals: [],
            drawPoints: [],
            area: -1,
        },
    ] as AreaMeasure[],
    currentIndex: 0 as number,
    bookmarkPoints: [] as { points: [number, number, number][]; normals: [number, number, number][] }[],
};

export const areaSlice = createSlice({
    name: "area",
    initialState: initialState,
    reducers: {
        setCurrentArea: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
        },
        deleteArea: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
            if (state.areaList.length > 1) {
                state.areaList = state.areaList.splice(action.payload - 1, 1);
            } else {
                state.areaList = [
                    {
                        points: [],
                        normals: [],
                        drawPoints: [],
                        area: -1,
                    },
                ];
            }
        },
        setDrawPoints: (state, action: PayloadAction<vec3[]>) => {
            state.areaList[state.currentIndex].drawPoints = action.payload;
        },
        setPoints: (state, action: PayloadAction<{ points: vec3[]; normals: vec3[] }>) => {
            state.areaList[state.currentIndex].points = action.payload.points;
            state.areaList[state.currentIndex].normals = action.payload.normals;
        },
        setArea: (state, action: PayloadAction<number>) => {
            state.areaList[state.currentIndex].area = action.payload;
        },
        addPoint: (state, action: PayloadAction<[vec3, vec3]>) => {
            state.areaList[state.currentIndex].points = state.areaList[state.currentIndex].points.concat([
                action.payload[0],
            ]);
            state.areaList[state.currentIndex].normals = state.areaList[state.currentIndex].normals.concat([
                action.payload[1],
            ]);
        },
        undoPoint: (state) => {
            state.areaList[state.currentIndex].points = state.areaList[state.currentIndex].points.slice(
                0,
                state.areaList[state.currentIndex].points.length - 1
            );
        },
        newArea: (state) => {
            if (state.areaList[state.areaList.length - 1].points.length) {
                state.areaList.push({
                    points: [],
                    normals: [],
                    drawPoints: [],
                    area: -1,
                });
                state.currentIndex = state.areaList.length - 1;
            }
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            if (action.payload.measurements.area.points) {
                // legacy
                state.areaList = [
                    {
                        points: action.payload.measurements.area.points.map((p) => p[0]),
                        normals: action.payload.measurements.area.points.map((p) => p[1]),
                        drawPoints: [],
                        area: -1,
                    },
                ];
            } else {
                state.bookmarkPoints = action.payload.measurements.area.areas;
            }
        });
        builder.addCase(resetView, (state) => {
            state.areaList = [
                {
                    points: [],
                    normals: [],
                    drawPoints: [],
                    area: -1,
                },
            ];
        });
    },
});

export const selectCurrentAreaPoints = (state: RootState) => state.area.areaList[state.area.currentIndex].points;
export const selectCurrentArea = (state: RootState) => state.area.areaList[state.area.currentIndex];
export const selectCurrentAreaValue = (state: RootState) => state.area.areaList[state.area.currentIndex].area;
export const selectCurrentIndex = (state: RootState) => state.area.currentIndex;
export const selectAreas = (state: RootState) => state.area.areaList;
export const selectAreaBookmarkPoints = (state: RootState) => state.area.bookmarkPoints;

const { actions, reducer } = areaSlice;
export { actions as areaActions, reducer as areaReducer };
