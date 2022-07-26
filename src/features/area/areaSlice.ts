import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    // TODO(OLA)
    points: [
        [14.248479788071133, 8.279134735182428, -6.293996625442638],
        [11.075991309752467, 10.689187993346955, -15.359711240554805],
        [21.8837865177773, 10.689180524646371, -14.572992803241636],
        [24.140817017348837, 8.279104087509019, -8.743587750643652],
        [19.876977658068796, 8.27908937918923, -4.795942014252894],
    ] as vec3[],
    area: undefined as number | undefined,
};

type State = typeof initialState;

export const areaSlice = createSlice({
    name: "area",
    initialState: initialState,
    reducers: {
        setPoints: (state, action: PayloadAction<State["points"]>) => {
            state.points = action.payload;
        },
        setArea: (state, action: PayloadAction<State["area"]>) => {
            state.area = action.payload;
        },
        addPoint: (state, action: PayloadAction<vec3>) => {
            state.points = state.points.concat([action.payload]);
        },
        undoPoint: (state) => {
            state.points = state.points.slice(0, state.points.length - 1);
        },
    },
});

export const selectAreaPoints = (state: RootState) => state.area.points;
export const selectArea = (state: RootState) => state.area.area;

const { actions, reducer } = areaSlice;
export { actions as areaActions, reducer as areaReducer };
