import { createSelector } from "@reduxjs/toolkit";

import { PermissionKey } from "apis/dataV2/permissions";
import { type RootState } from "app";
import { featuresConfig, Widget } from "config/features";

import { ProjectType, SceneType, UrlSearchQuery, UserRole } from "./types";

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
export const selectProjectV2Info = (state: RootState) => state.explorer.projectV2Info;
export const selectTmZoneForCalc = (state: RootState) => state.explorer.tmZoneForCalc;

export const selectEnabledWidgetsWithoutPermissionCheck = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

export const selectEnabledWidgets = createSelector(
    [selectEnabledWidgetsWithoutPermissionCheck, selectProjectV2Info],
    (widgets, projectInfo) => {
        if (projectInfo) {
            const can = (key: PermissionKey) => projectInfo.permissions.has(key);

            const canManageScene = can("scene:manage");
            const hasWidgetAccess = can("widget");
            const hasIntAccess = can("int");

            return widgets.filter((w) => {
                switch (w.key) {
                    case "bimcollab":
                    case "bimTrack":
                    case "ditio":
                    case "jira":
                    case "omegaPims365":
                    case "xsiteManage":
                        return hasIntAccess || can(`int:${w.key}`) || can(`int:${w.key}:use`);
                    case "bookmarks":
                        return can("bookmark") || can("bookmark:read");
                    case "groups":
                        return can("group") || can("group:read");
                    case "forms":
                        return can("forms") || can("forms:view");
                    case "deviations":
                        return can("deviation") || can("deviation:read");
                    case "advancedSettings":
                        return canManageScene;
                    default:
                        return hasWidgetAccess || can(`widget:${w.key}` as PermissionKey);
                }
            });
        }

        return widgets;
    }
);
