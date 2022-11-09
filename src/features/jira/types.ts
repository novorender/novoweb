export type Space = {
    avatarUrl: string;
    id: string;
    name: string;
    scopes: string[];
    url: string;
};

export type Project = {
    expand: string;
    self: string;
    id: string;
    key: string;
    name: string;
    avatarUrls: {
        [key: string]: string | undefined;
    };
    projectTypeKey: string;
    simplified: boolean;
    style: string;
    isPrivate: boolean;
    properties: { [key: string]: unknown };
};

export type Component = {
    self: string;
    id: string;
    name: string;
    description: string;
    lead?: {
        self: string;
        accountId: string;
        avatarUrls: {
            [key: string]: string | undefined;
        };
        displayName: string;
        active: boolean;
    };
    assigneeType: string;
    assignee:
        | {
              self: string;
              accountId: string;
              avatarUrls: {
                  [key: string]: string | undefined;
              };
              displayName: string;
              active: boolean;
          }
        | "UNASSIGNED";
    realAssigneeType: string;
    realAssignee?: {
        self: string;
        accountId: string;
        avatarUrls: {
            [key: string]: string | undefined;
        };
        displayName: string;
        active: boolean;
    };
    isAssigneeTypeValid: boolean;
    project: string;
    projectId: number;
};

export type Issue = {
    key: string;
    fields: {
        summary: string;
    };
};

export type Permission = {
    id: string;
    key: string;
    name: string;
    type: string;
    description: string;
    havePermission: boolean;
};

export type IssueType = {
    self: string;
    id: string;
    description: string;
    iconUrl: string;
    name: string;
    subtask: boolean;
    avatarId: number;
    entityId: string;
    hierarchyLevel: number;
    scope?: {
        type: string;
        project: {
            id: string;
            key: string;
            name: string;
        };
    };
};

export type CreateIssueMetadata = {
    self: string;
    id: string;
    description: string;
    iconUrl: string;
    name: string;
    untranslatedName: string;
    subtask: boolean;
    expand: string;
    fields: {
        [key: string]: CreateIssueMetadataField;
    };
};

type CreateIssueMetadataField = {
    required: boolean;
    schema: { type: string; system: string };
    name: string;
    key: string;
    hasDefaultValue: boolean;
    operations: string[];
    autoCompleteUrl?: string;
    defaultValue?: CreateIssueMetadataFieldValue;
    allowedValues: CreateIssueMetadataFieldValue[];
};

type CreateIssueMetadataFieldValue = {
    self: string;
    id: string;
    name: string;
    key?: string;
    description?: string;
    iconUrl?: string;
    projectTypeKey?: string;
    simplified?: boolean;
    hierarchyLevel?: number;
    subtask?: boolean;
    avatarId?: number;
    avatarUrls?: {
        [key: string]: string;
    };
};

export type Assignee = {
    self: string;
    accountId: string;
    accountType: string;
    emailAddress: string;
    avatarUrls: {
        [key: string]: string;
    };
    displayName: string;
    active: boolean;
    timeZone: string;
    locale: string;
};
