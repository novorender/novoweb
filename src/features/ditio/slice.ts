import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { AuthConfig, Project } from "./types";

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
    authConfig: undefined as AuthConfig | undefined,
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    refreshToken: undefined as undefined | { token: string; refreshIn: number },
    showMarkers: true,
    clickedMarker: "",
    lastViewedPath: "/",
    project: undefined as undefined | Project,
    feedScrollOffset: 0,
    filters: {
        [FilterType.Posts]: true,
        [FilterType.Alerts]: true,
        [FilterType.DateFrom]: "",
        [FilterType.DateTo]: "",
    },
    activePost: "",
    activeImg: "",
    hoveredEntity: undefined as { kind: "post" | "image"; id: string } | undefined,
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
        setRefreshToken: (state, action: PayloadAction<State["refreshToken"]>) => {
            state.refreshToken = action.payload;
        },
        setAuthConfig: (state, action: PayloadAction<State["authConfig"]>) => {
            state.authConfig = action.payload;
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
        setProject: (state, action: PayloadAction<State["project"]>) => {
            state.project = action.payload;
        },
        setFeedScrollOffset: (state, action: PayloadAction<State["feedScrollOffset"]>) => {
            state.feedScrollOffset = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<FeedFilters>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setActivePost: (state, action: PayloadAction<State["activePost"]>) => {
            state.activePost = action.payload;
        },
        setActiveImg: (state, action: PayloadAction<State["activeImg"]>) => {
            state.activeImg = action.payload;
        },
        setHoveredEntity: (state, action: PayloadAction<State["hoveredEntity"]>) => {
            state.hoveredEntity = action.payload;
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
export const selectDitioRefreshToken = (state: RootState) => state.ditio.refreshToken;
export const selectAuthConfig = (state: RootState) => state.ditio.authConfig;
export const selectShowDitioMarkers = (state: RootState) => state.ditio.showMarkers;
export const selectClickedMarker = (state: RootState) => state.ditio.clickedMarker;
export const selectLastViewedPath = (state: RootState) => state.ditio.lastViewedPath;
export const selectDitioProject = (state: RootState) => state.ditio.project;
export const selectFeedScrollOffset = (state: RootState) => state.ditio.feedScrollOffset;
export const selectFilters = (state: RootState) => state.ditio.filters;
export const selectActivePost = (state: RootState) => state.ditio.activePost;
export const selectActiveImg = (state: RootState) => state.ditio.activeImg;
export const selectHoveredEntity = (state: RootState) => state.ditio.hoveredEntity;

const { actions, reducer } = ditioSlice;
export { actions as ditioActions, reducer as ditioReducer };
