import { LineStripMeasureValues, View } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app";
import { resetView, selectBookmark } from "features/render";

export type PointLine = {
    points: vec3[];
    result: undefined | LineStripMeasureValues;
};

export enum PointLineMode {
    Default,
    Horizontal,
    Vertical,
}

const pointLine = (): PointLine => ({
    points: [],
    result: undefined,
});

const initialState = {
    pointLines: [pointLine()],
    currentIndex: 0 as number,
    mode: PointLineMode.Default,
};

export const pointLineSlice = createSlice({
    name: "pointLine",
    initialState: initialState,
    reducers: {
        addPoint: {
            reducer: (state, { payload: pt, meta: { view } }: PayloadAction<vec3, string, { view: View }>) => {
                const current = state.pointLines[state.currentIndex];
                const prevPt = current.points.at(-1);

                if (!prevPt || state.mode === PointLineMode.Default) {
                    current.points.push(pt);
                } else if (state.mode === PointLineMode.Horizontal) {
                    current.points.push([pt[0], pt[1], prevPt[2]]);
                } else {
                    current.points.push([prevPt[0], prevPt[1], pt[2]]);
                }

                current.result = view.measure?.core.measureLineStrip(current.points);
            },
            prepare: (pt: vec3, view: View) => {
                return { payload: pt, meta: { view } };
            },
        },
        connectPoints: {
            reducer: (state, { meta: { view } }: PayloadAction<void, string, { view: View }>) => {
                const current = state.pointLines[state.currentIndex];

                if (current.points.length < 2) {
                    return state;
                }

                current.points.push([...current.points[0]]);
                current.result = view.measure?.core.measureLineStrip(current.points);
            },
            prepare: (view: View) => {
                return { payload: undefined, meta: { view } };
            },
        },
        undoPoint: {
            reducer: (state, { meta: { view } }: PayloadAction<void, string, { view: View }>) => {
                const current = state.pointLines[state.currentIndex];
                current.points.pop();
                current.result = view.measure?.core.measureLineStrip(current.points);
            },
            prepare: (view: View) => {
                return { payload: undefined, meta: { view } };
            },
        },
        clearCurrent: (state) => {
            state.pointLines[state.currentIndex] = pointLine();
        },
        setCurrent: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
        },
        clear: () => {
            return initialState;
        },
        toggleLockElevation: (state) => {
            state.mode = state.mode === PointLineMode.Horizontal ? PointLineMode.Default : PointLineMode.Horizontal;
        },
        toggleLockVertical: (state) => {
            state.mode = state.mode === PointLineMode.Vertical ? PointLineMode.Default : PointLineMode.Vertical;
        },
        newPointLine: (state) => {
            if (state.pointLines[state.pointLines.length - 1].points.length) {
                state.pointLines.push(pointLine());
                state.currentIndex = state.pointLines.length - 1;
                state.mode = PointLineMode.Default;
            }
        },
        deletePointline: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
            if (state.pointLines.length > 1) {
                state.pointLines.splice(action.payload, 1);
            } else {
                state.pointLines = [pointLine()];
            }
            state.currentIndex = state.pointLines.length - 1;
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            const pointLine = action.payload.measurements.pointLine;
            const view = action.meta.view;

            if ("points" in pointLine) {
                state.pointLines = [
                    {
                        points: pointLine.points,
                        result: view.measure?.core.measureLineStrip(pointLine.points),
                    },
                ];
            } else {
                state.pointLines = pointLine.pointLines.map((points) => ({
                    points,
                    result: view.measure?.core.measureLineStrip(points),
                }));
            }
        });
        builder.addCase(resetView, (state) => {
            state.pointLines = [pointLine()];
            state.currentIndex = 0;
        });
    },
});

export const selectPointLines = (state: RootState) => state.pointLine.pointLines;
export const selectCurrentPointLine = (state: RootState) => state.pointLine.pointLines[state.pointLine.currentIndex];
export const selectLockPointLineElevation = (state: RootState) => state.pointLine.mode === PointLineMode.Horizontal;
export const selectLockPointLineVertical = (state: RootState) => state.pointLine.mode === PointLineMode.Vertical;
export const selectPointLineCurrentIdx = (state: RootState) => state.pointLine.currentIndex;

const { actions, reducer } = pointLineSlice;
export { actions as pointLineActions, reducer as pointLineReducer };
