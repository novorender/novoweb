import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { initScene } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

export enum FilterType {
    Posts = "posts",
    Alerts = "alerts",
    DateFrom = "date_from",
    DateTo = "date_to",
}

const initialState = {
    config: {
        projects: [] as string[],
    },
    accessToken: { status: AsyncStatus.Initial } as AsyncState<{ token: string; refreshIn: number }>,
    lastViewedPath: "/",
    machines: {
        showMarkers: true,
    },
    feed: {
        initialized: false,
        showMarkers: true,
        clickedMarker: "",
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
    },
};

export const initialFilters = initialState.feed.filters;
export type FeedFilters = typeof initialFilters;

type State = typeof initialState;

export const ditioSlice = createSlice({
    name: "ditio",
    initialState: initialState,
    reducers: {
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;
        },

        toggleShowMachineMarkers: (state, action: PayloadAction<boolean | undefined>) => {
            if (action.payload === undefined) {
                state.machines.showMarkers = !state.machines.showMarkers;
            } else {
                state.machines.showMarkers = action.payload;
            }
        },

        toggleShowFeedMarkers: (state, action: PayloadAction<boolean | undefined>) => {
            if (action.payload === undefined) {
                state.feed.showMarkers = !state.feed.showMarkers;
            } else {
                state.feed.showMarkers = action.payload;
            }
        },
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setClickedMarker: (state, action: PayloadAction<State["feed"]["clickedMarker"]>) => {
            state.feed.clickedMarker = action.payload;
        },
        setFeedScrollOffset: (state, action: PayloadAction<State["feed"]["feedScrollOffset"]>) => {
            state.feed.feedScrollOffset = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<FeedFilters>>) => {
            state.feed.filters = { ...state.feed.filters, ...action.payload };
        },
        setActivePost: (state, action: PayloadAction<State["feed"]["activePost"]>) => {
            state.feed.activePost = action.payload;
        },
        setActiveImg: (state, action: PayloadAction<State["feed"]["activeImg"]>) => {
            state.feed.activeImg = action.payload;
        },
        setHoveredEntity: (state, action: PayloadAction<State["feed"]["hoveredEntity"]>) => {
            state.feed.hoveredEntity = action.payload;
        },
        setFeedInitialized: (state, action: PayloadAction<boolean>) => {
            state.feed.initialized = action.payload;
        },
        resetFilters: (state) => {
            state.feed.filters = initialFilters;
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const props = action.payload.sceneData.customProperties;

            if (props.integrations?.ditio?.projects) {
                state.config.projects = props.integrations.ditio.projects;
            }
        });
    },
});

export const selectDitioAccessToken = (state: RootState) => state.ditio.accessToken;
export const selectDitioProjects = (state: RootState) => state.ditio.config.projects;
export const selectLastViewedPath = (state: RootState) => state.ditio.lastViewedPath;

export const selectShowDitioMachineMarkers = (state: RootState) => state.ditio.machines.showMarkers;

export const selectShowDitioFeedMarkers = (state: RootState) => state.ditio.feed.showMarkers;
export const selectClickedMarker = (state: RootState) => state.ditio.feed.clickedMarker;
export const selectFeedScrollOffset = (state: RootState) => state.ditio.feed.feedScrollOffset;
export const selectFilters = (state: RootState) => state.ditio.feed.filters;
export const selectActivePost = (state: RootState) => state.ditio.feed.activePost;
export const selectActiveImg = (state: RootState) => state.ditio.feed.activeImg;
export const selectHoveredEntity = (state: RootState) => state.ditio.feed.hoveredEntity;
export const selectDitioFeedInitialized = (state: RootState) => state.ditio.feed.initialized;

const { actions, reducer } = ditioSlice;
export { actions as ditioActions, reducer as ditioReducer };
