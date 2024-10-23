import { createSelector } from "@reduxjs/toolkit";

import { Permission } from "apis/dataV2/permissions";
import { type RootState } from "app";
import { defaultEnabledWidgets, featuresConfig, Widget } from "config/features";
import { checkPermission } from "utils/auth";

import { ProjectType, SceneType, UrlSearchQuery } from "./types";
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
export const selectRequireConsent = (state: RootState) => state.explorer.requireConsent;
export const selectOrganization = (state: RootState) => state.explorer.organization;
export const selectMaximized = (state: RootState) => state.explorer.maximized;
export const selectMaximizedHorizontal = (state: RootState) => state.explorer.maximizedHorizontal;
export const selectMinimized = (state: RootState) => state.explorer.minimized;
export const selectPrimaryMenu = (state: RootState) => state.explorer.primaryMenu;
export const selectIsAdminScene = (state: RootState) => state.explorer.sceneType === SceneType.Admin;
export const selectCanvasContextMenuFeatures = (state: RootState) => state.explorer.contextMenu.canvas.features;
export const selectIsOnline = (state: RootState) => state.explorer.isOnline;
export const selectConfig = (state: RootState) => state.explorer.config;
export const selectProjectIsV2 = (state: RootState) => state.explorer.projectType === ProjectType.V2;
export const selectProjectVersion = (state: RootState) => state.explorer.projectVersion;
export const selectProjectV2Info = (state: RootState) => state.explorer.projectV2Info;
export const selectTmZoneForCalc = (state: RootState) => state.explorer.tmZoneForCalc;
export const selectNewDesignRaw = (state: RootState) => state.explorer.newDesign;
export const selectCanUseNewDesign = (state: RootState) => state.explorer.canUseNewDesign;
export const selectSnackbarMessage = (state: RootState) => state.explorer.snackbarMessage;
export const selectHighlightSetting = (state: RootState) => state.explorer.highlightSetting;
export const selectGlobalSearchOpen = (state: RootState) => state.explorer.globalSearch.open;

export const selectNewDesign = createSelector([selectWidgetLayout, selectNewDesignRaw], (layout, newDesign) =>
    layout.sideBySide ? newDesign : false,
);
export const selectProjectName = (state: RootState) => state.explorer.projectName;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;

export const selectEnabledWidgetsWithoutPermissionCheck = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[],
);

export const selectEnabledWidgets = createSelector(
    [selectEnabledWidgetsWithoutPermissionCheck, selectProjectV2Info, selectNewDesign],
    (widgets, projectInfo, newDesign) => {
        if (projectInfo) {
            const permissionSet = new Set(projectInfo.permissions);
            const can = (p: Permission) => checkPermission(permissionSet, p);

            return widgets.filter((w) => {
                if (defaultEnabledWidgets.includes(w.key)) {
                    return true;
                }

                // Temp permission for new UX components
                // TODO redo when new UX is released
                if ("newUx" in w && w.newUx) {
                    return newDesign;
                }

                switch (w.key) {
                    case "bimcollab":
                    case "bimTrack":
                    case "ditio":
                    case "jira":
                    case "arcgis":
                    case "omegaPims365":
                    case "xsiteManage":
                        return can(`int:${w.key}:use` as Permission);
                    case "omega365":
                        return can(`int:omegaPims365:use` as Permission);
                    case "bookmarks":
                        return can(Permission.BookmarkRead);
                    case "clash":
                        return can(Permission.ClashRead);
                    case "groups":
                        return can(Permission.GroupRead);
                    case "forms":
                        return can(Permission.FormsView);
                    case "deviations":
                        return can(Permission.DeviationRead);
                    case "advancedSettings":
                        return can(Permission.SceneManage);
                    default:
                        return can(`widget:${w.key}` as Permission);
                }
            });
        }

        return widgets;
    },
);

export const selectGridSize = createSelector([selectWidgetLayout], (layout) => ({
    width: layout.widgets === 4 ? 2 : 1,
    height: layout.widgets === 1 ? 1 : 2,
}));

export const selectPositionedWidgets = createSelector(
    [selectWidgets, selectGridSize, selectMaximized, selectMaximizedHorizontal],
    (widgets, { width, height }, maximized, maximizedHorizontal) =>
        getPositionedWidgets({ widgets, gridWidth: width, gridHeight: height, maximized, maximizedHorizontal }),
);

export const selectCanAddWidget = createSelector(
    [selectWidgetLayout, selectWidgets, selectMaximized, selectMaximizedHorizontal],
    (layout, widgets, maximized, maximizedHorizontal) =>
        getTakenWidgetSlotCount(widgets, maximized, maximizedHorizontal) < layout.widgets,
);
