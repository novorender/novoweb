import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SearchPattern } from "@novorender/webgl-api";

import {
    featuresConfig,
    WidgetKey,
    Widget,
    defaultEnabledWidgets,
    defaultLockedWidgets,
    ButtonKey,
} from "config/features";
import type { RootState } from "app/store";
import { uniqueArray } from "utils/misc";

import { DeepWritable } from "features/render/renderSlice";

export enum SceneType {
    Viewer,
    Admin,
}

export enum UserRole {
    Viewer,
    Admin,
    Owner,
}

type UrlSearchQuery = undefined | string | SearchPattern[];
type WritableUrlSearchQuery = DeepWritable<UrlSearchQuery>;

const initialState = {
    enabledWidgets: defaultEnabledWidgets,
    lockedWidgets: defaultLockedWidgets,
    sceneType: SceneType.Viewer,
    userRole: UserRole.Viewer,
    requireConsent: false,
    organization: "",
    widgets: [] as WidgetKey[],
    maximized: undefined as undefined | WidgetKey,
    minimized: undefined as undefined | WidgetKey,
    primaryMenu: {
        button1: featuresConfig.home.key,
        button2: featuresConfig.cameraSpeed.key,
        button3: featuresConfig.flyToSelected.key,
        button4: featuresConfig.stepBack.key,
        button5: featuresConfig.stepForwards.key as ButtonKey,
    },
    urlSearchQuery: undefined as WritableUrlSearchQuery,
    urlBookmarkId: undefined as undefined | string,
    localBookmarkId: undefined as undefined | string,
};

type State = typeof initialState;
export type PrimaryMenuConfigType = State["primaryMenu"];

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
        setWidgets: (state, action: PayloadAction<WidgetKey[]>) => {
            state.widgets = action.payload;
        },
        addWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.widgets = state.widgets.concat(action.payload);
        },
        replaceWidgetSlot: (state, action: PayloadAction<{ replace: WidgetKey; key: WidgetKey }>) => {
            state.minimized = undefined;

            if (state.maximized === action.payload.replace) {
                state.maximized = action.payload.key;
            }

            const widgets = [...state.widgets];
            const indexToReplace = widgets.indexOf(action.payload.replace);

            if (indexToReplace !== -1) {
                widgets[indexToReplace] = action.payload.key;
            }

            state.widgets = widgets;
        },
        removeWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.maximized = undefined;
            state.minimized = undefined;
            state.widgets = state.widgets.filter((slot) => slot !== action.payload);
        },
        setUrlBookmarkId: (state, action: PayloadAction<State["urlBookmarkId"]>) => {
            state.urlBookmarkId = action.payload;
        },
        setLocalBookmarkId: (state, action: PayloadAction<State["localBookmarkId"]>) => {
            state.localBookmarkId = action.payload;
        },
        setUrlSearchQuery: (
            state,
            action: PayloadAction<{ query: UrlSearchQuery; selectionOnly: string } | undefined>
        ) => {
            const patterns = action.payload?.query;

            state.urlSearchQuery = patterns as WritableUrlSearchQuery;

            if ((Array.isArray(patterns) && patterns.length) || (!Array.isArray(patterns) && patterns)) {
                state.widgets = [
                    featuresConfig.search.key,
                    action.payload?.selectionOnly === "3"
                        ? featuresConfig.selectionBasket.key
                        : featuresConfig.properties.key,
                ];
            }
        },
        setMaximized: (state, action: PayloadAction<State["maximized"]>) => {
            if (action.payload) {
                state.widgets = [action.payload];
                state.minimized = undefined;
            }
            state.maximized = action.payload;
        },
        setMinimized: (state, action: PayloadAction<State["maximized"]>) => {
            if (action.payload) {
                state.maximized = undefined;
            }
            state.minimized = action.payload;
        },
        setRequireConsent: (state, action: PayloadAction<State["requireConsent"]>) => {
            state.requireConsent = action.payload;
        },
        setOrganization: (state, action: PayloadAction<State["organization"]>) => {
            state.organization = action.payload;
        },
        setPrimaryMenu: (state, action: PayloadAction<Partial<State["primaryMenu"]>>) => {
            state.primaryMenu = { ...state.primaryMenu, ...action.payload };
        },
    },
});

export const selectWidgets = (state: RootState) => state.explorer.widgets;
export const selectLockedWidgets = (state: RootState) => state.explorer.lockedWidgets;
export const selectLocalBookmarkId = (state: RootState) => state.explorer.localBookmarkId;
export const selectUrlBookmarkId = (state: RootState) => state.explorer.urlBookmarkId;
export const selectUrlSearchQuery = (state: RootState) => state.explorer.urlSearchQuery as UrlSearchQuery;
export const selectSceneType = (state: RootState) => state.explorer.sceneType;
export const selectUserRole = (state: RootState) => state.explorer.userRole;
export const selectRequireConsent = (state: RootState) => state.explorer.requireConsent;
export const selectOrganization = (state: RootState) => state.explorer.organization;
export const selectMaximized = (state: RootState) => state.explorer.maximized;
export const selectMinimized = (state: RootState) => state.explorer.minimized;
export const selectPrimaryMenu = (state: RootState) => state.explorer.primaryMenu;
export const selectIsAdminScene = (state: RootState) => state.explorer.sceneType === SceneType.Admin;
export const selectHasAdminCapabilities = (state: RootState) => state.explorer.userRole !== UserRole.Viewer;

export const selectEnabledWidgets = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

// Action creators are generated for each case reducer function
const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };
