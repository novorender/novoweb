export type AuthScope = {
    organizationId?: string;
    projectId?: string;
    resourcePath?: string;
    resourceType?: ResourceType;
    viewerSceneId?: string;
};

export enum ResourceType {
    Folder = "folder",
    File = "file",
    Bookmark = "bookmark",
    Widget = "widget",
}

export type Role = {
    id: string;
    name: string;
    description: string;
    scope: AuthScope;
};
