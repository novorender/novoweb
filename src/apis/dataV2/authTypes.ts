export type PermissionInfo = {
    id: string;
    name: string;
    description: string;
    isRootOnly: boolean;
    isReadOnlyPermission: boolean;
    children?: PermissionInfo[];
};

export type AuthScope = {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    resourceType?: ResourceType;
    sceneId?: string;
};

export enum ResourceType {
    // Root,
    // Organization,
    // Project,
    Folder = "folder",
    File = "file",
    Bookmark = "bookmark",
    Widget = "widget",
}
