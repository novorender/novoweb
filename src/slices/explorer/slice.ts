import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { CanvasContextMenuFeatureKey, defaultCanvasContextMenuFeatures } from "config/canvasContextMenu";
import {
    ButtonKey,
    defaultEnabledAdminWidgets,
    defaultEnabledWidgets,
    defaultLockedWidgets,
    featuresConfig,
    FeatureType,
    WidgetKey,
} from "config/features";
import { newDesignLocalStorageKey } from "features/newDesign/utils";
import { initScene } from "features/render";
import { uniqueArray } from "utils/misc";

import { MutableUrlSearchQuery, ProjectType, SceneType, State, UrlSearchQuery, UserRole } from "./types";
import {
    getCanvasContextMenuFeatures,
    getEnabledFeatures,
    getPrimaryMenu,
    getRequireConsent,
    getSceneType,
    getTakenWidgetSlotCount,
    getUserRole,
} from "./utils";

const initialState: State = {
    isOnline: navigator.onLine,
    enabledWidgets: defaultEnabledWidgets,
    lockedWidgets: defaultLockedWidgets,
    sceneType: SceneType.Viewer,
    userRole: UserRole.Viewer,
    projectType: ProjectType.V1,
    tmZoneForCalc: undefined as string | undefined, // for project v1 - tmZone, for project v2 - proj4 def from epsg.io
    requireConsent: false,
    organization: "",
    widgets: [],
    favoriteWidgets: [],
    widgetSlot: {
        open: false,
        group: undefined,
    },
    widgetLayout: {
        widgets: 4,
        sideBySide: true,
        padWidgetsTop: false,
    },
    widgetGroupPanelState: {
        open: true,
        expanded: false,
    },
    maximized: [],
    maximizedHorizontal: [],
    minimized: undefined,
    primaryMenu: {
        button1: featuresConfig.home.key,
        button2: featuresConfig.cameraSpeed.key,
        button3: featuresConfig.flyToSelected.key,
        button4: featuresConfig.stepBack.key,
        button5: featuresConfig.stepForwards.key,
    },
    contextMenu: {
        canvas: {
            features: defaultCanvasContextMenuFeatures,
        },
    },
    urlSearchQuery: undefined,
    urlBookmarkId: undefined,
    localBookmarkId: undefined,
    config: {
        dataServerUrl: import.meta.env.REACT_APP_DATA_SERVER_URL ?? "https://data.novorender.com/api",
        dataV2ServerUrl: import.meta.env.REACT_APP_DATA_V2_SERVER_URL ?? "https://data-v2.novorender.com",
        projectsUrl: import.meta.env.REACT_APP_PROJECTS_URL ?? "https://projects.novorender.com",
        authServerUrl: import.meta.env.REACT_APP_AUTH_SERVER_URL ?? "https://auth.novorender.com",
        bimCollabClientSecret: import.meta.env.REACT_APP_BIMCOLLAB_CLIENT_SECRET ?? "",
        bimCollabClientId: import.meta.env.REACT_APP_BIMCOLLAB_CLIENT_ID ?? "",
        bimTrackClientSecret: import.meta.env.REACT_APP_BIMTRACK_CLIENT_SECRET ?? "",
        bimTrackClientId: import.meta.env.REACT_APP_BIMTRACK_CLIENT_ID ?? "",
        jiraClientId: import.meta.env.REACT_APP_JIRA_CLIENT_ID ?? "",
        jiraClientSecret: import.meta.env.REACT_APP_JIRA_CLIENT_SECRET ?? "",
        xsiteManageClientId: import.meta.env.REACT_APP_XSITEMANAGE_CLIENT_ID ?? "",
        novorenderClientId: import.meta.env.REACT_APP_NOVORENDER_CLIENT_ID ?? "",
        novorenderClientSecret: import.meta.env.REACT_APP_NOVORENDER_CLIENT_SECRET ?? "",
        assetsUrl: import.meta.env.ASSETS_URL ?? "https://novorenderblobs.blob.core.windows.net/assets",
    },
    newDesign: localStorage.getItem(newDesignLocalStorageKey) === "false" ? false : true,
    snackbarMessage: null,
};

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
            state.maximized = state.maximized.filter((widget) => action.payload.includes(widget));
            state.maximizedHorizontal = state.maximizedHorizontal.filter((widget) => action.payload.includes(widget));
        },
        addWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.widgets = state.widgets.concat(action.payload);
            maybeHideWidgetSlot(state);
        },
        replaceWidgetSlot: (state, action: PayloadAction<{ replace: WidgetKey; key: WidgetKey }>) => {
            state.minimized = undefined;

            if (state.maximized.includes(action.payload.replace)) {
                state.maximized = state.maximized.map((key) =>
                    key === action.payload.replace ? action.payload.key : key
                );
            }

            if (state.maximizedHorizontal.includes(action.payload.replace)) {
                state.maximizedHorizontal = state.maximizedHorizontal.map((key) =>
                    key === action.payload.replace ? action.payload.key : key
                );
            }

            const widgets = [...state.widgets];
            const indexToReplace = widgets.indexOf(action.payload.replace);

            if (indexToReplace !== -1) {
                widgets[indexToReplace] = action.payload.key;
            }

            state.widgets = widgets;
        },
        removeWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.minimized = undefined;

            // better layout change for particular case
            const widgetIndex = state.widgets.indexOf(action.payload);
            if (
                widgetIndex === 0 &&
                state.widgets.length === 3 &&
                state.maximizedHorizontal.includes(state.widgets[1])
            ) {
                state.widgets[0] = state.widgets[2];
                state.widgets.splice(2, 1);
            }

            state.widgets = state.widgets.filter((slot) => slot !== action.payload);
            removeIrrelevantMaximized(state);

            // if (state.maximized.length !== state.widgets.length) {
            //     state.maximized = [];
            // }
            // if (state.maximizedHorizontal.length !== state.widgets.length) {
            //     state.maximizedHorizontal = [];
            // }
        },
        addFavoriteWidget: (state, action: PayloadAction<WidgetKey>) => {
            const key = action.payload;
            if (!state.favoriteWidgets.includes(key)) {
                state.favoriteWidgets.push(key);
            }
        },
        removeFavoriteWidget: (state, action: PayloadAction<WidgetKey>) => {
            const key = action.payload;
            state.favoriteWidgets = state.favoriteWidgets.filter((w) => w !== key);
        },
        setWidgetSlot: (state, action: PayloadAction<State["widgetSlot"]>) => {
            state.widgetSlot = action.payload;
        },
        setWidgetGroupPanelState: (state, action: PayloadAction<State["widgetGroupPanelState"]>) => {
            state.widgetGroupPanelState = action.payload;
        },
        forceOpenWidget: (state, action: PayloadAction<WidgetKey>) => {
            const open = state.widgets;
            const maximized = state.maximized;
            const maximizedHorizontal = state.maximizedHorizontal;
            const layout = state.widgetLayout;

            if (open.includes(action.payload)) {
                return;
            }

            if (getTakenWidgetSlotCount(open, maximized, maximizedHorizontal) < layout.widgets) {
                open.push(action.payload);
                return;
            }

            state.maximized = [];
            state.maximizedHorizontal = [];
            if (open.length >= layout.widgets) {
                open.pop();
            }
            open.push(action.payload);
        },
        setWidgetLayout: (state, action: PayloadAction<State["widgetLayout"]>) => {
            state.widgetLayout = action.payload;
        },
        setUrlBookmarkId: (state, action: PayloadAction<State["urlBookmarkId"]>) => {
            state.urlBookmarkId = action.payload;
        },
        setLocalBookmarkId: (state, action: PayloadAction<State["localBookmarkId"]>) => {
            state.localBookmarkId = action.payload;
        },
        setUrlSearchQuery: (
            state,
            action: PayloadAction<
                { query: UrlSearchQuery; options: { selectionOnly: string; openWidgets: boolean } } | undefined
            >
        ) => {
            const patterns = action.payload?.query;

            state.urlSearchQuery = patterns as MutableUrlSearchQuery;

            if (
                action.payload?.options.openWidgets &&
                ((Array.isArray(patterns) && patterns.length) || (!Array.isArray(patterns) && patterns))
            ) {
                state.widgets = [
                    featuresConfig.search.key,
                    action.payload?.options.selectionOnly === "3"
                        ? featuresConfig.selectionBasket.key
                        : featuresConfig.properties.key,
                ];
            }
        },
        toggleMaximized: (state, action: PayloadAction<WidgetKey>) => {
            if (state.maximized.includes(action.payload)) {
                state.maximized = state.maximized.filter((widget) => widget !== action.payload);

                return;
            }

            state.minimized = undefined;
            if (state.maximizedHorizontal.includes(action.payload)) {
                state.widgets = [action.payload];
                state.maximizedHorizontal = [action.payload];
                state.maximized = [action.payload];

                return;
            }

            if (state.maximizedHorizontal.length) {
                state.widgets = state.widgets.filter((w) => !state.maximizedHorizontal.includes(w));
                state.maximizedHorizontal = state.maximizedHorizontal.filter((w) => state.widgets.includes(w));
            }

            if (state.maximized.length) {
                state.widgets = state.widgets.filter(
                    (widget) => state.maximized.includes(widget) || widget === action.payload
                );
            } else {
                const idx = state.widgets.indexOf(action.payload);
                if (state.newDesign) {
                    // only non maximized widgets at this point
                    const canShift =
                        getTakenWidgetSlotCount(state.widgets, state.maximized, state.maximizedHorizontal) <
                        state.widgetLayout.widgets;

                    switch (idx) {
                        case 0:
                            if (!canShift) {
                                state.widgets.splice(1, 1);
                            }
                            break;
                        case 1:
                            if (canShift) {
                                [state.widgets[0], state.widgets[1]] = [state.widgets[1], state.widgets[0]];
                            } else {
                                state.widgets.splice(0, 1);
                            }
                            break;
                        case 2:
                            state.widgets.splice(3, 1);
                            break;
                        case 3:
                            state.widgets.splice(2, 1);
                            break;
                    }
                } else {
                    switch (idx) {
                        case 0:
                            state.widgets.splice(1, 1);
                            break;
                        case 1:
                            state.widgets.splice(0, 1);
                            break;
                        case 2:
                            state.widgets.splice(3, 1);
                            break;
                        case 3:
                            state.widgets.splice(2, 1);
                            break;
                    }
                }
            }

            state.maximized.push(action.payload);
            removeIrrelevantMaximized(state);
            maybeHideWidgetSlot(state);
        },
        toggleMaximizedHorizontal: (state, action: PayloadAction<WidgetKey>) => {
            if (state.maximizedHorizontal.includes(action.payload)) {
                state.maximizedHorizontal = state.maximizedHorizontal.filter((widget) => widget !== action.payload);

                return;
            }

            state.minimized = undefined;
            if (state.maximized.includes(action.payload)) {
                state.widgets = [action.payload];
                state.maximized = [action.payload];
                state.maximizedHorizontal = [action.payload];

                return;
            }

            if (state.maximized.length) {
                state.widgets = state.widgets.filter((w) => !state.maximized.includes(w));
                state.maximized = state.maximized.filter((w) => state.widgets.includes(w));
            }

            if (state.maximizedHorizontal.length) {
                const idx = state.widgets.indexOf(action.payload);
                if (idx === 2) {
                    state.widgets.splice(2, 1);
                    state.widgets.unshift(action.payload);
                }
                state.widgets = state.widgets.filter(
                    (widget) => state.maximizedHorizontal.includes(widget) || widget === action.payload
                );
            } else {
                // only non maximized widgets at this point
                const idx = state.widgets.indexOf(action.payload);
                const canShift =
                    getTakenWidgetSlotCount(state.widgets, state.maximized, state.maximizedHorizontal) <
                    state.widgetLayout.widgets;

                switch (idx) {
                    case 0:
                        if (!canShift) {
                            state.widgets.splice(2, 1);
                        }
                        break;
                    case 1:
                        state.widgets.splice(3, 1);
                        break;
                    case 2:
                        if (canShift) {
                            state.widgets.splice(2, 1);
                            state.widgets.unshift(action.payload);
                        } else {
                            state.widgets[0] = action.payload;
                            state.widgets.splice(2, 1);
                        }
                        break;
                    case 3:
                        state.widgets.splice(3, 1);
                        state.widgets.splice(1, 1, action.payload);
                        break;
                }
            }

            state.maximizedHorizontal.push(action.payload);
            removeIrrelevantMaximized(state);
            maybeHideWidgetSlot(state);
        },
        setMinimized: (state, action: PayloadAction<State["minimized"]>) => {
            if (action.payload) {
                state.maximized = [];
                state.maximizedHorizontal = [];
            }
            state.minimized = action.payload;
        },
        clearMaximized: (state) => {
            state.maximized = [];
            state.maximizedHorizontal = [];
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
        setCanvasContextMenu: (state, action: PayloadAction<Partial<State["contextMenu"]["canvas"]>>) => {
            state.contextMenu.canvas = { ...state.contextMenu.canvas, ...action.payload };
        },
        toggleIsOnline: (state, action: PayloadAction<State["isOnline"] | undefined>) => {
            state.isOnline = action.payload !== undefined ? action.payload : !state.isOnline;
        },
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = { ...state.config, ...action.payload };
        },
        setSnackbarMessage: (state, action: PayloadAction<State["snackbarMessage"]>) => {
            state.snackbarMessage = action.payload;
        },
        setNewDesign: (state, action: PayloadAction<State["newDesign"]>) => {
            state.newDesign = action.payload;
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const { customProperties } = action.payload.sceneData;

            state.projectType = action.payload.projectType;
            state.tmZoneForCalc = action.payload.tmZoneForCalc;
            state.sceneType = getSceneType(customProperties);
            state.userRole = getUserRole(customProperties);
            state.requireConsent = getRequireConsent(customProperties);

            state.lockedWidgets = state.lockedWidgets.filter(
                (widget) =>
                    !customProperties?.features || !(customProperties?.features as Record<string, boolean>)[widget]
            );
            if (action.payload.deviceProfile.isMobile && !state.lockedWidgets.includes(featuresConfig.images.key)) {
                state.lockedWidgets.push(featuresConfig.images.key);
            }
            if (state.userRole !== UserRole.Viewer) {
                state.enabledWidgets = uniqueArray(
                    (
                        (customProperties.explorerProjectState?.features?.widgets?.enabled as WidgetKey[]) ??
                        getEnabledFeatures(customProperties)
                    )
                        .concat(defaultEnabledAdminWidgets)
                        .concat(defaultEnabledWidgets)
                );
            } else {
                state.enabledWidgets = uniqueArray(
                    (
                        (customProperties.explorerProjectState?.features?.widgets?.enabled as WidgetKey[])?.filter(
                            (key) => featuresConfig[key] && featuresConfig[key].type !== FeatureType.AdminWidget
                        ) ?? getEnabledFeatures(customProperties)
                    ).concat(defaultEnabledWidgets)
                );
            }

            if (customProperties.explorerProjectState?.features?.primaryMenu?.buttons) {
                const [button1, button2, button3, button4, button5] = customProperties.explorerProjectState.features
                    .primaryMenu.buttons as ButtonKey[];

                state.primaryMenu = {
                    button1,
                    button2,
                    button3,
                    button4,
                    button5,
                };
            } else {
                state.primaryMenu = getPrimaryMenu(customProperties) ?? state.primaryMenu;
            }

            if (customProperties.explorerProjectState?.features?.contextMenus?.canvas.primary.features) {
                const ctxMenuFeatures = customProperties.explorerProjectState.features.contextMenus.canvas.primary
                    .features as CanvasContextMenuFeatureKey[];
                state.contextMenu.canvas.features = ctxMenuFeatures;
            } else {
                state.contextMenu.canvas.features =
                    getCanvasContextMenuFeatures(customProperties) ?? state.contextMenu.canvas.features;
            }
        });
    },
});

function removeIrrelevantMaximized(state: State) {
    state.maximized = state.maximized.filter((w) => state.widgets.includes(w));
    state.maximizedHorizontal = state.maximizedHorizontal.filter((w) => state.widgets.includes(w));
}

function maybeHideWidgetSlot(state: State) {
    if (
        getTakenWidgetSlotCount(state.widgets, state.maximized, state.maximizedHorizontal) >=
            state.widgetLayout.widgets &&
        state.widgetSlot.open
    ) {
        state.widgetSlot.open = false;
    }
}

const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };
