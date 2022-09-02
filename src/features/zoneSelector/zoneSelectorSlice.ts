import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    points: [[]] as vec3[][],
};

type State = typeof initialState;

export const zoneSelectorSlice = createSlice({
    name: "zoneSelector",
    initialState: initialState,
    reducers: {
        removeZone: (state, action: PayloadAction<number>) => {
            if (state.points.length === 1) {
                state.points = [[]];
            } else {
                state.points = state.points.splice(action.payload, 1);
            }
        },
        setPoints: (state, action: PayloadAction<State["points"]>) => {
            state.points = action.payload;
        },
        addPoint: (state, action: PayloadAction<vec3>) => {
            let current = state.points[state.points.length - 1];
            if (current.length > 1) {
                const p = action.payload as vec3;
                const dir = vec3.sub(vec3.create(), current[0], current[1]);
                vec3.normalize(dir, dir);
                const n = vec3.cross(vec3.create(), dir, vec3.fromValues(0, 1, 0));
                const po = vec3.sub(vec3.create(), current[0], p);
                const t = vec3.dot(po, n);

                if (current.length > 2) {
                    current = current.slice(0, 2);
                }
                current = current.concat([
                    vec3.scaleAndAdd(vec3.create(), current[1], n, -t),
                    vec3.scaleAndAdd(vec3.create(), current[0], n, -t),
                ]);
            } else {
                current = current.concat([action.payload]);
            }
            state.points = [...state.points.slice(0, state.points.length - 1), current];
        },
        addExtent(state) {
            const current = state.points[state.points.length - 1];
            if (current.length === 4) {
                state.points = [...state.points, []];
            }
        },
        undoPoint: (state) => {
            let current = state.points[state.points.length - 1];
            if (current.length > 2) {
                current = current.slice(0, 2);
            } else {
                current = current.slice(0, current.length - 1);
            }
            state.points = [...state.points.slice(0, state.points.length - 1), current];
        },
    },
});

export const selectZoneSelectorPoints = (state: RootState) => state.zoneSelector.points;

const { actions, reducer } = zoneSelectorSlice;
export { actions as zoneSelectorActions, reducer as zoneSelectorReducer };
