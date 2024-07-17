import { createSelector } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { featuresConfig, Widget } from "config/features";

import { ProjectType, SceneType, UrlSearchQuery, UserRole } from "./types";
import { getPositionedWidgets, getTakenWidgetSlotCount } from "./utils";

export const selectWidgets = (state: RootState) => state.explorer.widgets;
export const selectFavoriteWidgets = (state: RootState) => state.explorer.favoriteWidgets;
export const selectWidgetSlot = (state: RootState) => state.explorer.widgetSlot;
export const selectWidgetLayout = (state: RootState) => state.explorer.widgetLayout;
export const selectWidgetGroupPanelState = (state: RootState) => state.explorer.widgetGroupPanelState;
export const selectLockedWidgets = (state: RootState) => state.explorer.lockedWidgets;
export const selectLocalBookmarkId = (state: RootState) => state.explorer.localBookmarkId;
export const selectUrlBookmarkId = (state: RootState) => state.explorer.urlBookmarkId;
export const selectUrlSearchQuery = (state: RootState) => state.explorer.urlSearchQuery as UrlSearchQuery;
export const selectSceneType = (state: RootState) => state.explorer.sceneType;
export const selectUserRole = (state: RootState) => state.explorer.userRole;
export const selectRequireConsent = (state: RootState) => state.explorer.requireConsent;
export const selectOrganization = (state: RootState) => state.explorer.organization;
export const selectMaximized = (state: RootState) => state.explorer.maximized;
export const selectMaximizedHorizontal = (state: RootState) => state.explorer.maximizedHorizontal;
export const selectMinimized = (state: RootState) => state.explorer.minimized;
export const selectPrimaryMenu = (state: RootState) => state.explorer.primaryMenu;
export const selectIsAdminScene = (state: RootState) => state.explorer.sceneType === SceneType.Admin;
export const selectHasAdminCapabilities = (state: RootState) => state.explorer.userRole !== UserRole.Viewer;
export const selectCanvasContextMenuFeatures = (state: RootState) => state.explorer.contextMenu.canvas.features;
export const selectIsOnline = (state: RootState) => state.explorer.isOnline;
export const selectConfig = (state: RootState) => state.explorer.config;
export const selectProjectIsV2 = (state: RootState) => state.explorer.projectType === ProjectType.V2;
export const selectTmZoneForCalc = (state: RootState) => state.explorer.tmZoneForCalc;
export const selectNewDesignRaw = (state: RootState) => state.explorer.newDesign;
export const selectSnackbarMessage = (state: RootState) => state.explorer.snackbarMessage;

export const selectNewDesign = createSelector([selectWidgetLayout, selectNewDesignRaw], (layout, newDesign) =>
    layout.widgets === 1 ? false : newDesign
);

export const selectEnabledWidgets = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

export const selectGridSize = createSelector([selectWidgetLayout], (layout) => ({
    width: layout.widgets === 4 ? 2 : 1,
    height: layout.widgets === 1 ? 1 : 2,
}));

export const selectPositionedWidgets = createSelector(
    [selectWidgets, selectGridSize, selectMaximized, selectMaximizedHorizontal],
    (widgets, { width, height }, maximized, maximizedHorizontal) =>
        getPositionedWidgets({ widgets, gridWidth: width, gridHeight: height, maximized, maximizedHorizontal })
);

export const selectCanAddWidget = createSelector(
    [selectWidgetLayout, selectWidgets, selectMaximized, selectMaximizedHorizontal],
    (layout, widgets, maximized, maximizedHorizontal) =>
        getTakenWidgetSlotCount(widgets, maximized, maximizedHorizontal) < layout.widgets
);
