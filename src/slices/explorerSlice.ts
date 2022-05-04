import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SearchPattern } from "@novorender/webgl-api";
import { ScenePreview } from "@novorender/data-js-api";

import { featuresConfig, WidgetKey, Widget, defaultEnabledWidgets, defaultLockedWidgets } from "config/features";
import type { RootState } from "app/store";
import { uniqueArray } from "utils/misc";

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
    enabledWidgets: defaultEnabledWidgets,
    lockedWidgets: defaultLockedWidgets,
    sceneType: SceneType.Viewer,
    userRole: UserRole.Viewer,
    requireConsent: false,
    organization: "",
    viewerScenes: [] as ScenePreview[],
    widgets: [] as WidgetKey[],
    urlSearchQuery: undefined as undefined | string | SearchPattern[],
    urlBookmarkId: undefined as undefined | string,
};

type State = typeof initialState;

export const explorerSlice = createSlice({
    name: "explorer",
    initialState: initialState,
    reducers: {
        setEnabledWidgets: (state, action: PayloadAction<WidgetKey[]>) => {
            state.enabledWidgets = uniqueArray(action.payload);
        },
        lockWidgets: (state, action: PayloadAction<WidgetKey[]>) => {
            state.lockedWidgets = state.lockedWidgets.concat(action.payload);
        },
        unlockWidgets: (state, action: PayloadAction<WidgetKey[]>) => {
            state.lockedWidgets = state.lockedWidgets.filter((widget) => !action.payload.includes(widget));
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
        setUrlBookmarkId: (state, action: PayloadAction<State["urlBookmarkId"]>) => {
            state.urlBookmarkId = action.payload;
        },
        setUrlSearchQuery: (
            state,
            action: PayloadAction<{ query: State["urlSearchQuery"]; selectionOnly: string } | undefined>
        ) => {
            const patterns = action.payload?.query;

            state.urlSearchQuery = patterns;

            if ((Array.isArray(patterns) && patterns.length) || (!Array.isArray(patterns) && patterns)) {
                state.widgets = [
                    featuresConfig.search.key,
                    action.payload?.selectionOnly === "3"
                        ? featuresConfig.selectionBasket.key
                        : featuresConfig.properties.key,
                ];
            }
        },
        setRequireConsent: (state, action: PayloadAction<State["requireConsent"]>) => {
            state.requireConsent = action.payload;
        },
        setOrganization: (state, action: PayloadAction<State["organization"]>) => {
            state.organization = action.payload;
        },
    },
});

export const selectWidgets = (state: RootState) => state.explorer.widgets;
export const selectLockedWidgets = (state: RootState) => state.explorer.lockedWidgets;
export const selectUrlBookmarkId = (state: RootState) => state.explorer.urlBookmarkId;
export const selectUrlSearchQuery = (state: RootState) => state.explorer.urlSearchQuery;
export const selectSceneType = (state: RootState) => state.explorer.sceneType;
export const selectUserRole = (state: RootState) => state.explorer.userRole;
export const selectViewerScenes = (state: RootState) => state.explorer.viewerScenes;
export const selectRequireConsent = (state: RootState) => state.explorer.requireConsent;
export const selectOrganization = (state: RootState) => state.explorer.organization;

export const selectIsAdminScene = (state: RootState) => state.explorer.sceneType === SceneType.Admin;
export const selectHasAdminCapabilities = (state: RootState) => state.explorer.userRole !== UserRole.Viewer;

export const selectEnabledWidgets = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

// Action creators are generated for each case reducer function
const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };
