import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

export enum LocationStatus {
    Idle,
    Loading,
    Error,
}

const initialState = {
    showMarker: false,
    currentLocation: undefined as undefined | vec3,
    accuracy: undefined as undefined | number,
    status: {} as
        | { status: LocationStatus.Idle | LocationStatus.Loading }
        | { status: LocationStatus.Error; msg: string },
};

type State = typeof initialState;

export const myLocationSlice = createSlice({
    name: "area",
    initialState: initialState,
    reducers: {
        setCurrentLocation: (state, action: PayloadAction<State["currentLocation"]>) => {
            state.currentLocation = action.payload;
        },
        toggleShowMarker: (state, action: PayloadAction<boolean | undefined>) => {
            state.showMarker = action.payload ?? !state.showMarker;
        },
        setSatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setAccuracy: (state, action: PayloadAction<State["accuracy"]>) => {
            state.accuracy = action.payload;
        },
    },
});

export const selectCurrentLocation = (state: RootState) => state.myLocation.currentLocation;
export const selectShowLocationMarker = (state: RootState) => state.myLocation.showMarker;
export const selectLocationStatus = (state: RootState) => state.myLocation.status;
export const selectLocationAccuracy = (state: RootState) => state.myLocation.accuracy;

const { actions, reducer } = myLocationSlice;
export { actions as myLocationActions, reducer as myLocationReducer };