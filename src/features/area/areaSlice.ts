import { View } from "@novorender/api";
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

const areaMeasure = (): AreaMeasure => {
    return {
        points: [],
        normals: [],
        drawPoints: [],
        area: -1,
    };
};

const initialState = {
    areas: [areaMeasure()],
    currentIndex: 0 as number,
};

export const areaSlice = createSlice({
    name: "area",
    initialState: initialState,
    reducers: {
        addPt: {
            reducer: (
                state,
                {
                    payload: [pt, normal],
                    meta: { view },
                }: PayloadAction<[pt: vec3, normal: vec3], string, { view: View }>
            ) => {
                const current = state.areas[state.currentIndex];
                current.points.push(pt);
                current.normals.push(normal);

                const area = computeArea(current, view);
                current.area = area.area;
                current.drawPoints = area.drawPoints;
            },
            prepare: (pt: [pt: vec3, normal: vec3], view: View) => {
                return { payload: pt, meta: { view } };
            },
        },
        undoPt: {
            reducer: (state, { meta: { view } }: PayloadAction<void, string, { view: View }>) => {
                const current = state.areas[state.currentIndex];
                current.points.pop();
                current.normals.pop();

                const area = computeArea(current, view);
                current.area = area.area;
                current.drawPoints = area.drawPoints;
            },
            prepare: (view: View) => {
                return { payload: undefined, meta: { view } };
            },
        },
        clearCurrent: (state) => {
            state.areas[state.currentIndex] = areaMeasure();
        },
        clear: () => {
            return initialState;
        },
        setCurrentArea: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
        },
        deleteArea: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
            if (state.areas.length > 1) {
                state.areas.splice(action.payload, 1);
            } else {
                state.areas = [areaMeasure()];
            }
            state.currentIndex = state.areas.length - 1;
        },
        newArea: (state) => {
            if (state.areas[state.areas.length - 1].points.length) {
                state.areas.push(areaMeasure());
                state.currentIndex = state.areas.length - 1;
            }
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            const area = action.payload.measurements.area;
            const view = action.meta.view;

            if (area.points) {
                const _area = {
                    ...areaMeasure(),
                    points: area.points.map((p) => p[0]),
                    normals: area.points.map((p) => p[1]),
                };
                state.areas = [
                    {
                        ..._area,
                        ...computeArea(_area, view),
                    },
                ];
            } else {
                state.areas = action.payload.measurements.area.areas.map((area) => ({
                    ...area,
                    ...computeArea(area, view),
                }));
            }
        });
        builder.addCase(resetView, (state) => {
            state.areas = [areaMeasure()];
            state.currentIndex = 0;
        });
    },
});

export const selectCurrentAreaPoints = (state: RootState) => state.area.areas[state.area.currentIndex].points;
export const selectCurrentArea = (state: RootState) => state.area.areas[state.area.currentIndex];
export const selectCurrentAreaValue = (state: RootState) => state.area.areas[state.area.currentIndex].area;
export const selectCurrentIndex = (state: RootState) => state.area.currentIndex;
export const selectAreas = (state: RootState) => state.area.areas;

const { actions, reducer } = areaSlice;
export { actions as areaActions, reducer as areaReducer };

function computeArea(
    { points, normals }: { points: vec3[]; normals: vec3[] },
    view: View
): { area: number; drawPoints: vec3[] } {
    const area = points.length ? view.measure?.core.areaFromPolygon(points, normals) : undefined;

    return area
        ? {
              area: area.area ?? -1,
              drawPoints: area.polygon,
          }
        : {
              area: -1,
              drawPoints: [],
          };
}
