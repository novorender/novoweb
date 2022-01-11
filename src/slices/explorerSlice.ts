import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SearchPattern } from "@novorender/webgl-api";

import { featuresConfig, WidgetKey, Widget, defaultEnabledWidgets } from "config/features";
import type { RootState } from "app/store";
import { ScenePreview } from "@novorender/data-js-api";

export enum SceneType {
    Viewer,
    Admin,
}

export enum UserRole {
    Viewer,
    Admin,
    Owner,
}

const initialState = {
    enabledWidgets: defaultEnabledWidgets as WidgetKey[],
    sceneType: SceneType.Viewer,
    userRole: UserRole.Viewer,
    viewerScenes: [] as ScenePreview[],
    widgets: ["panoramas"] as WidgetKey[],
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
        setUserRole: (state, action: PayloadAction<UserRole>) => {
            state.userRole = action.payload;
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
export const selectUserRole = (state: RootState) => state.explorer.userRole;
export const selectViewerScenes = (state: RootState) => state.explorer.viewerScenes;

export const selectIsAdminScene = (state: RootState) => state.explorer.sceneType === SceneType.Admin;
export const selectHasAdminCapabilities = (state: RootState) => state.explorer.userRole !== UserRole.Viewer;

export const selectEnabledWidgets = createSelector(
    (state: RootState) => [state.explorer.enabledWidgets, state.render] as [WidgetKey[], RootState["render"]],
    ([widgets, renderState]) =>
        widgets
            .map((key) => featuresConfig[key])
            .filter((config: Widget) => {
                if (!config) {
                    return false;
                }

                if (!("dependencies" in config)) {
                    return true;
                }

                if (config.dependencies.renderType) {
                    const renderType = config.dependencies.renderType;

                    return renderType.some((type) =>
                        Array.isArray(type) && Array.isArray(renderState.renderType)
                            ? type[0] === renderState.renderType[0] && type[1] === renderState.renderType[1]
                            : type === renderState.renderType
                    );
                }

                return true;
            }) as Widget[]
);

// Action creators are generated for each case reducer function
const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };
