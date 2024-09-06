import { SearchPattern } from "@novorender/webgl-api";

import { ProjectInfo } from "apis/dataV2/projectTypes";
import { CanvasContextMenuFeatureKey } from "config/canvasContextMenu";
import { ButtonKey, FeatureGroupKey, WidgetKey } from "config/features";
import { DeepMutable } from "types/misc";

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

export type UrlSearchQuery = undefined | string | SearchPattern[];
export type MutableUrlSearchQuery = DeepMutable<UrlSearchQuery>;

export type State = {
    isOnline: boolean;
    enabledWidgets: WidgetKey[];
    lockedWidgets: WidgetKey[];
    sceneType: SceneType;
    userRole: UserRole;
    projectType: ProjectType;
    projectV2Info: ProjectInfo | null;
    tmZoneForCalc: string | undefined;
    requireConsent: boolean;
    organization: string;
    projectName: string;
    widgets: WidgetKey[];
    favoriteWidgets: WidgetKey[];
    widgetSlot: {
        open: boolean;
        group: FeatureGroupKey | undefined;
    };
    widgetLayout: {
        widgets: number;
        sideBySide: boolean;
        padWidgetsTop?: boolean;
    };
    widgetGroupPanelState: {
        open: boolean;
        expanded: boolean;
    };
    maximized: WidgetKey[];
    maximizedHorizontal: WidgetKey[];
    minimized: WidgetKey | undefined;
    primaryMenu: {
        button1: ButtonKey;
        button2: ButtonKey;
        button3: ButtonKey;
        button4: ButtonKey;
        button5: ButtonKey;
    };
    contextMenu: {
        canvas: {
            features: CanvasContextMenuFeatureKey[];
        };
    };
    urlSearchQuery: MutableUrlSearchQuery;
    urlBookmarkId: string | undefined;
    localBookmarkId: string | undefined;
    config: {
        dataV2ServerUrl: string;
        projectsUrl: string;
        authServerUrl: string;
        bimCollabClientSecret: string;
        bimCollabClientId: string;
        bimTrackClientSecret: string;
        bimTrackClientId: string;
        jiraClientId: string;
        jiraClientSecret: string;
        xsiteManageClientId: string;
        novorenderClientId: string;
        novorenderClientSecret: string;
        assetsUrl: string;
        mixpanelToken: string;
    };
    newDesign: boolean;
    canUseNewDesign: boolean;
    snackbarMessage: {
        msg: string;
        closeAfter?: number;
    } | null;
};

export type PrimaryMenuConfigType = State["primaryMenu"];

export type PositionedWidgetState = {
    key: WidgetKey;
    x: number;
    y: number;
    width: number;
    height: number;
};
