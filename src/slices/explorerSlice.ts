import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SearchPattern } from "@novorender/webgl-api";

import { config as featuresConfig, WidgetKey, Widget, defaultEnabledWidgets } from "config/features";
import type { RootState } from "app/store";
import { ScenePreview } from "@novorender/data-js-api";

export enum SceneType {
    Viewer,
    Admin,
}

const initialState = {
    enabledWidgets: defaultEnabledWidgets as WidgetKey[],
    sceneType: SceneType.Viewer,
    viewerScenes: [] as ScenePreview[],
    widgets: [] as WidgetKey[],
    urlSearchQuery: undefined as undefined | string | SearchPattern[],
};

type State = typeof initialState;

export const explorerSlice = createSlice({
    name: "explorer",
    initialState: initialState,
    reducers: {
        setEnabledWidgets: (state, action: PayloadAction<WidgetKey[]>) => {
            state.enabledWidgets = action.payload;
        },
        setSceneType: (state, action: PayloadAction<SceneType>) => {
            state.sceneType = action.payload;
        },
        setViewerScenes: (state, action: PayloadAction<ScenePreview[]>) => {
            state.viewerScenes = action.payload;
        },
        addViewerScene: (state, action: PayloadAction<ScenePreview>) => {
            state.viewerScenes = state.viewerScenes.concat(action.payload);
        },
        updateViewerScene: (state, action: PayloadAction<ScenePreview>) => {
            state.viewerScenes = state.viewerScenes.map((scene) =>
                scene.id === action.payload.id ? action.payload : scene
            );
        },
        deleteViewerScene: (state, action: PayloadAction<ScenePreview["id"]>) => {
            state.viewerScenes = state.viewerScenes.filter((scene) => scene.id !== action.payload);
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

export const selectWidgets = (state: RootState) => state.explorer.widgets;
export const selectUrlSearchQuery = (state: RootState) => state.explorer.urlSearchQuery;
export const selectSceneType = (state: RootState) => state.explorer.sceneType;
export const selectViewerScenes = (state: RootState) => state.explorer.viewerScenes;

export const selectIsAdminScene = createSelector(selectSceneType, (type) => type === SceneType.Admin);

export const selectEnabledWidgets = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

// Action creators are generated for each case reducer function
const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };
