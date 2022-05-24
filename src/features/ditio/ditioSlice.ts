import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { AuthConfig } from "./types";

export enum DitioStatus {
    Initial,
    LoadingAuthConfig,
    Ready,
}

export enum FilterType {
    Posts = "posts",
    Alerts = "alerts",
    DateFrom = "date_from",
    DateTo = "date_to",
}

const initialState = {
    status: DitioStatus.Initial,
    authConfig: undefined as AuthConfig | undefined,
    accessToken: "",
    markers: [] as {
        position: vec3;
        id: string;
    }[],
    showMarkers: false,
    clickedMarker: "",
    lastViewedPath: "/",
    projectId: "",
    feedScrollOffset: 0,
    filters: {
        [FilterType.Posts]: true,
        [FilterType.Alerts]: true,
        [FilterType.DateFrom]: "",
        [FilterType.DateTo]: "",
    },
};

export const initialFilters = initialState.filters;

type State = typeof initialState;
export type FeedFilters = typeof initialFilters;

export const ditioSlice = createSlice({
    name: "ditio",
    initialState: initialState,
    reducers: {
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setAuthConfig: (state, action: PayloadAction<State["authConfig"]>) => {
            state.authConfig = action.payload;
        },
        setMarkers: (state, action: PayloadAction<State["markers"]>) => {
            state.markers = action.payload;
        },
        toggleShowMarkers: (state, action: PayloadAction<State["showMarkers"] | undefined>) => {
            if (action.payload === undefined) {
                state.showMarkers = !state.showMarkers;
            } else {
                state.showMarkers = action.payload;
            }
        },
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setClickedMarker: (state, action: PayloadAction<State["clickedMarker"]>) => {
            state.clickedMarker = action.payload;
        },
        setProjectId: (state, action: PayloadAction<State["projectId"]>) => {
            state.projectId = action.payload;
        },
        setFeedScrollOffset: (state, action: PayloadAction<State["feedScrollOffset"]>) => {
            state.feedScrollOffset = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<FeedFilters>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        resetFilters: (state) => {
            state.filters = initialFilters;
        },
        logOut: () => {
            return initialState;
        },
    },
});

export const selectAccessToken = (state: RootState) => state.ditio.accessToken;
export const selectAuthConfig = (state: RootState) => state.ditio.authConfig;
export const selectStatus = (state: RootState) => state.ditio.status;
export const selectMarkers = (state: RootState) => state.ditio.markers;
export const selectShowMarkers = (state: RootState) => state.ditio.showMarkers;
export const selectClickedMarker = (state: RootState) => state.ditio.clickedMarker;
export const selectLastViewedPath = (state: RootState) => state.ditio.lastViewedPath;
export const selectProjectId = (state: RootState) => state.ditio.projectId;
export const selectFeedScrollOffset = (state: RootState) => state.ditio.feedScrollOffset;
export const selectFilters = (state: RootState) => state.ditio.filters;

const { actions, reducer } = ditioSlice;
export { actions as ditioActions, reducer as ditioReducer };
