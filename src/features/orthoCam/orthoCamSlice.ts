export {};
// import { RenderSettings } from "@novorender/webgl-api";
// import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
// import { RootState } from "app/store";
// import { vec3 } from "gl-matrix";

// import { DeepWritable } from "slices/renderSlice";

// const initialState = {
//     gridDefaults: {
//         enabled: false,
//         majorLineCount: 1001,
//         minorLineCount: 4,
//         majorColor: [0.15, 0.15, 0.15] as vec3,
//         minorColor: [0.65, 0.65, 0.65] as vec3,
//     },
//     grid: {
//         enabled: false,
//         majorLineCount: 1001,
//         minorLineCount: 4,
//         origo: [0, 0, 0],
//         axisX: [0, 0, 0],
//         axisY: [0, 0, 0],
//         majorColor: [0, 0, 0],
//         minorColor: [0, 0, 0],
//     } as WritableGrid,
// };
// type WritableGrid = DeepWritable<RenderSettings["grid"]>;

// type State = typeof initialState;

// export const orthoCamSlice = createSlice({
//     name: "orthoCam",
//     initialState: initialState,
//     reducers: {
//         setGridDefaults: (state, action: PayloadAction<Partial<State["gridDefaults"]>>) => {
//             state.gridDefaults = { ...state.gridDefaults, ...action.payload };
//             state.grid = { ...state.grid, ...state.gridDefaults };
//         },
//         setGrid: (state, action: PayloadAction<Partial<State["grid"]>>) => {
//             state.grid = { ...state.gridDefaults, ...action.payload } as WritableGrid;
//         },
//     },
// });

// export const selectGridDefaults = (state: RootState) => state.orthoCam.gridDefaults;
// export const selectGrid = (state: RootState) => state.orthoCam.grid as RenderSettings["grid"];

// const { actions, reducer } = orthoCamSlice;
// export { actions as orthoCamActions, reducer as orthoCamReducer };
