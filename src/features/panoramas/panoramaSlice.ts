import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

export type PanoramaType = {
    name: string;
    guid: string;
    position: [number, number, number];
    rotation: [number, number, number, number];
    preview: string;
    gltf: string;
};

export enum PanoramaStatus {
    Initial,
    Loading,
    Active,
}

const initialState = {
    panoramas: undefined as undefined | PanoramaType[],
    show3dMarkers: true,
    status: PanoramaStatus.Initial as
        | PanoramaStatus.Initial
        | [status: PanoramaStatus.Loading | PanoramaStatus.Active, id: string],
};

type State = typeof initialState;

export const panoramasSlice = createSlice({
    name: "panoramas",
    initialState: initialState,
    reducers: {
        setPanoramas: (state, action: PayloadAction<State["panoramas"]>) => {
            state.panoramas = action.payload;
        },
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setShow3dMarkers: (state, action: PayloadAction<State["show3dMarkers"]>) => {
            state.show3dMarkers = action.payload;
        },
    },
});

export const selectPanoramas = (state: RootState) => state.panoramas.panoramas;
export const selectPanoramaStatus = (state: RootState) => state.panoramas.status;
export const selectShow3dMarkers = (state: RootState) => state.panoramas.show3dMarkers;

export const selectActivePanorama = (state: RootState) => {
    const status = selectPanoramaStatus(state);

    if (!Array.isArray(status)) {
        return;
    }

    const panoramas = selectPanoramas(state);
    return panoramas?.find((pano) => pano.guid === status[1]);
};

const { actions, reducer } = panoramasSlice;
export { actions as panoramasActions, reducer as panoramasReducer };
