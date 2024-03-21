import { SearchPattern } from "@novorender/webgl-api";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "app/store";
import { CanvasContextMenuFeatureKey, defaultCanvasContextMenuFeatures } from "config/canvasContextMenu";
import {
    ButtonKey,
    defaultEnabledAdminWidgets,
    defaultEnabledWidgets,
    defaultLockedWidgets,
    featuresConfig,
    FeatureType,
    Widget,
    WidgetKey,
} from "config/features";
import { DeepMutable, initScene } from "features/render";
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

export enum ProjectType {
    V1, // app.novorender.com
    V2, // projects.novorender.com
}

type UrlSearchQuery = undefined | string | SearchPattern[];
type MutableUrlSearchQuery = DeepMutable<UrlSearchQuery>;

const initialState = {
    isOnline: navigator.onLine,
    enabledWidgets: defaultEnabledWidgets,
    lockedWidgets: defaultLockedWidgets,
    sceneType: SceneType.Viewer,
    userRole: UserRole.Viewer,
    projectType: ProjectType.V1,
    requireConsent: false,
    organization: "",
    widgets: [] as WidgetKey[],
    widgetLayout: {
        widgets: 4,
        sideBySide: true,
    },
    maximized: [] as WidgetKey[],
    minimized: undefined as undefined | WidgetKey,
    primaryMenu: {
        button1: featuresConfig.home.key as ButtonKey,
        button2: featuresConfig.cameraSpeed.key as ButtonKey,
        button3: featuresConfig.flyToSelected.key as ButtonKey,
        button4: featuresConfig.stepBack.key as ButtonKey,
        button5: featuresConfig.stepForwards.key as ButtonKey,
    },
    contextMenu: {
        canvas: {
            features: defaultCanvasContextMenuFeatures,
        },
    },
    urlSearchQuery: undefined as MutableUrlSearchQuery,
    urlBookmarkId: undefined as undefined | string,
    localBookmarkId: undefined as undefined | string,
    config: {
        dataServerUrl: (import.meta.env.REACT_APP_DATA_SERVER_URL ?? "https://data.novorender.com/api") as string,
        dataV2ServerUrl: (import.meta.env.REACT_APP_DATA_V2_SERVER_URL ?? "https://data-v2.novorender.com") as string,
        projectsUrl: (import.meta.env.REACT_APP_PROJECTS_URL ?? "https://projects.novorender.com") as string,
        authServerUrl: (import.meta.env.REACT_APP_AUTH_SERVER_URL ?? "https://auth.novorender.com") as string,
        bimCollabClientSecret: (import.meta.env.REACT_APP_BIMCOLLAB_CLIENT_SECRET ?? "") as string,
        bimCollabClientId: (import.meta.env.REACT_APP_BIMCOLLAB_CLIENT_ID ?? "") as string,
        bimTrackClientSecret: (import.meta.env.REACT_APP_BIMTRACK_CLIENT_SECRET ?? "") as string,
        bimTrackClientId: (import.meta.env.REACT_APP_BIMTRACK_CLIENT_ID ?? "") as string,
        jiraClientId: (import.meta.env.REACT_APP_JIRA_CLIENT_ID ?? "") as string,
        jiraClientSecret: (import.meta.env.REACT_APP_JIRA_CLIENT_SECRET ?? "") as string,
        xsiteManageClientId: (import.meta.env.REACT_APP_XSITEMANAGE_CLIENT_ID ?? "") as string,
        novorenderClientId: (import.meta.env.REACT_APP_NOVORENDER_CLIENT_ID ?? "") as string,
        novorenderClientSecret: (import.meta.env.REACT_APP_NOVORENDER_CLIENT_SECRET ?? "") as string,
    },
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
            state.maximized = state.maximized.filter((widget) => action.payload.includes(widget));
        },
        addWidgetSlot: (state, action: PayloadAction<WidgetKey>) => {
            state.widgets = state.widgets.concat(action.payload);
        },
        replaceWidgetSlot: (state, action: PayloadAction<{ replace: WidgetKey; key: WidgetKey }>) => {
            state.minimized = undefined;

            if (state.maximized.includes(action.payload.replace)) {
                state.maximized = state.maximized.map((key) =>
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
            state.maximized = state.maximized.filter((widget) => widget !== action.payload);
            state.widgets = state.widgets.filter((slot) => slot !== action.payload);

            if (state.maximized.length !== state.widgets.length) {
                state.maximized = [];
            }
        },
        forceOpenWidget: (state, action: PayloadAction<WidgetKey>) => {
            const open = state.widgets;
            const maximized = state.maximized;
            const layout = state.widgetLayout;

            if (open.includes(action.payload)) {
                return;
            }

            if (open.length + maximized.length < layout.widgets) {
                open.push(action.payload);
                return;
            }

            state.maximized = [];
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

                if (state.maximized.length !== state.widgets.length) {
                    state.maximized = [];
                }

                return;
            }

            state.minimized = undefined;

            if (state.maximized.length) {
                state.widgets = state.widgets.filter(
                    (widget) => state.maximized.includes(widget) || widget === action.payload
                );
            } else {
                const idx = state.widgets.indexOf(action.payload);
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

            state.maximized.push(action.payload);
        },
        setMinimized: (state, action: PayloadAction<State["minimized"]>) => {
            if (action.payload) {
                state.maximized = [];
            }
            state.minimized = action.payload;
        },
        clearMaximized: (state) => {
            state.maximized = [];
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
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const { customProperties } = action.payload.sceneData;

            state.projectType = action.payload.projectType;
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
                    (customProperties.explorerProjectState
                        ? (customProperties.explorerProjectState.features.widgets.enabled as WidgetKey[])
                        : getEnabledFeatures(customProperties)
                    )
                        .concat(defaultEnabledAdminWidgets)
                        .concat(defaultEnabledWidgets)
                );
            } else {
                state.enabledWidgets = uniqueArray(
                    (customProperties.explorerProjectState
                        ? (customProperties.explorerProjectState.features.widgets.enabled as WidgetKey[]).filter(
                              (key) => featuresConfig[key] && featuresConfig[key].type !== FeatureType.AdminWidget
                          )
                        : getEnabledFeatures(customProperties)
                    ).concat(defaultEnabledWidgets)
                );
            }

            if (customProperties.explorerProjectState) {
                const [button1, button2, button3, button4, button5] = customProperties.explorerProjectState.features
                    .primaryMenu.buttons as ButtonKey[];

                state.primaryMenu = {
                    button1,
                    button2,
                    button3,
                    button4,
                    button5,
                };

                const ctxMenuFeatures = customProperties.explorerProjectState.features.contextMenus.canvas.primary
                    .features as CanvasContextMenuFeatureKey[];
                state.contextMenu.canvas.features = ctxMenuFeatures;
            } else {
                state.primaryMenu = getPrimaryMenu(customProperties) ?? state.primaryMenu;
                state.contextMenu.canvas.features =
                    getCanvasContextMenuFeatures(customProperties) ?? state.contextMenu.canvas.features;
            }
        });
    },
});

export const selectWidgets = (state: RootState) => state.explorer.widgets;
export const selectWidgetLayout = (state: RootState) => state.explorer.widgetLayout;
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
export const selectCanvasContextMenuFeatures = (state: RootState) => state.explorer.contextMenu.canvas.features;
export const selectIsOnline = (state: RootState) => state.explorer.isOnline;
export const selectConfig = (state: RootState) => state.explorer.config;
export const selectProjectIsV2 = (state: RootState) => state.explorer.projectType === ProjectType.V2;

export const selectEnabledWidgets = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

const { actions, reducer } = explorerSlice;
export { actions as explorerActions, reducer as explorerReducer };

function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): WidgetKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        measurement: [featuresConfig.measure.key, featuresConfig.orthoCam.key],
        clipping: [
            // featuresConfig.clippingBox.key,
            featuresConfig.clippingPlanes.key,
        ],
        tree: featuresConfig.modelTree.key,
        layers: [featuresConfig.selectionBasket.key],
    };

    if (enabledFeatures.disableLink === false && enabledFeatures.shareLink !== false) {
        enabledFeatures.shareLink = true;
    }

    return uniqueArray(
        Object.keys(enabledFeatures)
            .map((key) => ({ key, enabled: enabledFeatures[key] }))
            .filter((feature) => feature.enabled)
            .map((feature) => (dictionary[feature.key] ? dictionary[feature.key] : feature.key))
            .concat(defaultEnabledWidgets)
            .flat() as WidgetKey[]
    );
}

function getEnabledFeatures(customProperties: unknown): WidgetKey[] {
    const features =
        customProperties && typeof customProperties === "object" && "enabledFeatures" in customProperties
            ? (customProperties as { enabledFeatures?: Record<string, boolean> }).enabledFeatures
            : undefined;

    return features ? enabledFeaturesToFeatureKeys(features) : [];
}

function getSceneType(customProperties: unknown): SceneType {
    return customProperties && typeof customProperties === "object" && "isViewer" in customProperties
        ? (customProperties as { isViewer: boolean }).isViewer
            ? SceneType.Viewer
            : SceneType.Admin
        : SceneType.Admin;
}

function getRequireConsent(customProperties: unknown): boolean {
    if (!customProperties || typeof customProperties !== "object") {
        return false;
    }

    if ("requireConsent" in customProperties) {
        return (customProperties as { requireConsent: boolean }).requireConsent;
    } else if ("enabledFeatures" in customProperties) {
        return Boolean(
            (customProperties as { enabledFeatures?: { requireConsent?: boolean } })?.enabledFeatures?.requireConsent
        );
    }

    return false;
}

function getUserRole(customProperties: unknown): UserRole {
    const role =
        customProperties && typeof customProperties === "object" && "role" in customProperties
            ? (customProperties as { role: string }).role
            : "administrator";
    return role === "owner" ? UserRole.Owner : role === "administrator" ? UserRole.Admin : UserRole.Viewer;
}

function getPrimaryMenu(customProperties: unknown): PrimaryMenuConfigType | undefined {
    return customProperties && typeof customProperties === "object" && "primaryMenu" in customProperties
        ? (customProperties as { primaryMenu: PrimaryMenuConfigType }).primaryMenu
        : undefined;
}

function getCanvasContextMenuFeatures(customProperties: unknown): CanvasContextMenuFeatureKey[] | undefined {
    return customProperties && typeof customProperties === "object" && "canvasContextMenu" in customProperties
        ? (customProperties as { canvasContextMenu: { features: CanvasContextMenuFeatureKey[] } }).canvasContextMenu
              .features
        : undefined;
}
