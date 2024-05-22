import { SearchPattern } from "@novorender/webgl-api";

import { CanvasContextMenuFeatureKey } from "config/canvasContextMenu";
import { ButtonKey, WidgetKey } from "config/features";
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
    projectVersion: string;
    tmZoneForCalc: string | undefined;
    requireConsent: boolean;
    organization: string;
    widgets: WidgetKey[];
    widgetLayout: {
        widgets: number;
        sideBySide: boolean;
    };
    maximized: WidgetKey[];
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
        dataServerUrl: string;
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
    };
};

export type PrimaryMenuConfigType = State["primaryMenu"];
