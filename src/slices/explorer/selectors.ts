import { createSelector } from "@reduxjs/toolkit";

import { Permission } from "apis/dataV2/permissions";
import { type RootState } from "app";
import { defaultEnabledWidgets, featuresConfig, Widget } from "config/features";
import { checkPermission } from "utils/auth";

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
export const selectAccessToken = (state: RootState) => state.auth.accessToken;

export const selectEnabledWidgetsWithoutPermissionCheck = createSelector(
    (state: RootState) => state.explorer.enabledWidgets,
    (widgets) => widgets.map((widget) => featuresConfig[widget]).filter((config) => config) as Widget[]
);

export const selectEnabledWidgets = createSelector(
    [selectEnabledWidgetsWithoutPermissionCheck, selectProjectV2Info],
    (widgets, projectInfo) => {
        if (projectInfo) {
            const permissionSet = new Set(projectInfo.permissions);
            const can = (p: Permission) => checkPermission(permissionSet, p);
            if (can(Permission.SceneManage)) {
                return widgets;
            }

            return widgets.filter((w) => {
                if (defaultEnabledWidgets.includes(w.key)) {
                    return true;
                }

                switch (w.key) {
                    case "bimcollab":
                    case "bimTrack":
                    case "ditio":
                    case "jira":
                    case "omegaPims365":
                    case "xsiteManage":
                        return can(`int:${w.key}:use` as Permission);
                    case "bookmarks":
                        return can(Permission.BookmarkRead);
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
    }
);
