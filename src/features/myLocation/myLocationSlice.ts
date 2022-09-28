import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    location: undefined as undefined | vec3,
};

type State = typeof initialState;

export const myLocationSlice = createSlice({
    name: "area",
    initialState: initialState,
    reducers: {
        setLocation: (state, action: PayloadAction<State["location"]>) => {
            state.location = action.payload;
        },
    },
});

export const selectMyLocation = (state: RootState) => state.myLocation.location;
export const selectShowLocation = (state: RootState) => state.render.picker;

const { actions, reducer } = myLocationSlice;
export { actions as myLocationActions, reducer as myLocationReducer };
