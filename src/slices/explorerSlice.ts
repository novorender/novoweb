import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SearchPattern } from "@novorender/webgl-api";

import { config as featuresConfig, FeatureType, WidgetKey, FeatureKey, Widget } from "config/features";
import type { RootState } from "app/store";

export enum FullscreenStatus {
    Initial,
    Fullscreen,
    Windowed,
}

const initialState = {
    fullscreen: FullscreenStatus.Initial,
    enabledFeatures: Object.values(featuresConfig).map((feature) => feature.key) as FeatureKey[],
    widgets: [] as WidgetKey[],
    urlSearchQuery: undefined as undefined | string | SearchPattern[],
};

type State = typeof initialState;

export const explorerSlice = createSlice({
    name: "explorer",
    initialState: initialState,
    reducers: {
        toggleFullscreen: (state) => {
            state.fullscreen = [FullscreenStatus.Initial, FullscreenStatus.Windowed].includes(state.fullscreen)
                ? FullscreenStatus.Fullscreen
                : FullscreenStatus.Windowed;
        },
        setFullscreen: (state, action: PayloadAction<FullscreenStatus>) => {
            state.fullscreen = action.payload;
        },
        setEnabledFeatures: (state, action: PayloadAction<FeatureKey[]>) => {
            state.enabledFeatures = action.payload;
        },
        setWidgets: (state, action: PayloadAction<WidgetKey[]>) => {
            state.widgets = action.payload;
        },
        addWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.widgets = state.widgets.concat(action.payload);
        },
        replaceWidgetSlot: (state, action: PayloadAction<{ replace: WidgetKey; key: WidgetKey }>) => {
            const widgets = [...state.widgets];
            const indexToReplace = widgets.indexOf(action.payload.replace);

            if (indexToReplace !== -1) {
                widgets[indexToReplace] = action.payload.key;
            }

            state.widgets = widgets;
        },
        removeWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.widgets = state.widgets.filter((slot) => slot !== action.payload);
        },
        setUrlSearchQuery: (state, action: PayloadAction<State["urlSearchQuery"]>) => {
            const patterns = action.payload;

            state.urlSearchQuery = patterns;

            if ((Array.isArray(patterns) && patterns.length) || (!Array.isArray(patterns) && patterns)) {
                state.widgets = [featuresConfig.search.key, featuresConfig.properties.key];
            }
        },
    },
});

export const selectFullscreen = (state: RootState) => state.explorer.fullscreen;
export const selectWidgets = (state: RootState) => state.explorer.widgets;
export const selectUrlSearchQuery = (state: RootState) => state.explorer.urlSearchQuery;

export const selectEnabledWidgets = createSelector(
    (state: RootState) => state.explorer.enabledFeatures,
    (widgets) =>
        widgets
            .map((widget) => featuresConfig[widget])
            .filter((config) => config && config.type === FeatureType.Widget) as Widget[]
);

// Action creators are generated for each case reducer function
const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };
