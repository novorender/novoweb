export type Permission = {
    id: string;
    name: string;
    description: string;
    isRootOnly: boolean;
    isReadOnlyPermission: boolean;
    children?: Permission[];
};

export type AuthScope = {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    resourceType?: ResourceType;
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
