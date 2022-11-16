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
        | string;
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

export type CurrentUser = {
    self: string;
    key: string;
    accountId: string;
    accountType: string;
    name: string;
    emailAddress: string;
    avatarUrls: {
        [key: string]: string;
    };
    displayName: string;
    active: true;
    timeZone: string;
    groups: {
        size: number;
        items: [];
    };
    applicationRoles: {
        size: number;
        items: [];
    };
};

export type Issue = {
    expand: string;
    id: string;
    self: string;
    key: string;
    fields: {
        statuscategorychangedate: string;
        issuetype: {
            self: string;
            id: string;
            description: string;
            iconUrl: string;
            name: string;
            subtask: boolean;
            avatarId: number;
            hierarchyLevel: number;
        };
        timespent: null;
        customfield_10030: null;
        project: Project;
        customfield_10031: [];
        customfield_10032: null;
        fixVersions: [];
        customfield_10033: null;
        aggregatetimespent: null;
        customfield_10034: null;
        resolution: null;
        customfield_10036: null;
        customfield_10027: null;
        customfield_10028: null;
        customfield_10029: null;
        resolutiondate: null;
        workratio: number;
        lastViewed: string;
        issuerestriction: { issuerestrictions: {}; shouldDisplay: boolean };
        watches: {
            self: string;
            watchCount: number;
            isWatching: true;
        };
        created: string;
        customfield_10020: null;
        customfield_10021: null;
        customfield_10022: null;
        priority: {
            self: string;
            iconUrl: string;
            name: string;
            id: string;
        };
        customfield_10023: null;
        customfield_10024: null;
        customfield_10025: null;
        customfield_10026: null;
        labels: [];
        customfield_10016: null;
        customfield_10017: null;
        customfield_10018: {
            hasEpicLinkFieldDependency: boolean;
            showField: boolean;
            nonEditableReason: {
                reason: string;
                message: string;
            };
        };
        customfield_10019: string;
        aggregatetimeoriginalestimate: null;
        timeestimate: null;
        versions: [];
        issuelinks: [];
        assignee: Assignee;
        updated: string;
        status: {
            self: string;
            description: string;
            iconUrl: string;
            name: string;
            id: string;
            statusCategory: {
                self: string;
                id: number;
                key: string;
                colorName: string;
                name: string;
            };
        };
        components: Component[];
        timeoriginalestimate: null;
        description: AtlassianDocumentFormat;
        customfield_10010: null;
        customfield_10014: null;
        customfield_10015: string;
        timetracking: {};
        customfield_10005: null;
        customfield_10006: null;
        customfield_10007: null;
        security: null;
        customfield_10008: null;
        aggregatetimeestimate: null;
        customfield_10009: null;
        attachment: {
            self: string;
            id: string;
            filename: string;
            author: {
                self: string;
                accountId: string;
                emailAddress: string;
                avatarUrls: {};
                displayName: string;
                active: true;
                timeZone: string;
                accountType: string;
            };
            created: string;
            size: 4658;
            mimeType: string;
            content: string;
            thumbnail: string;
        }[];
        summary: string;
        creator: Assignee;
        subtasks: [];
        customfield_10040: string;
        customfield_10041: null;
        customfield_10042: null;
        reporter: Assignee;
        aggregateprogress: { progress: number; total: number };
        customfield_10001: null;
        customfield_10002: null;
        customfield_10003: null;
        customfield_10004: null;
        environment: null;
        duedate: string | null;
        progress: { progress: number; total: number };
        votes: {
            self: string;
            votes: number;
            hasVoted: boolean;
        };
        comment: {
            comments: Comment[];
            self: string;
            maxResults: number;
            total: number;
            startAt: number;
        };
        worklog: { startAt: number; maxResults: number; total: number; worklogs: [] };
    };
};

type Comment = {
    self: string;
    id: string;
    author: Assignee;
    body: AtlassianDocumentFormat;
    updateAuthor: Assignee;
    created: string;
    updated: string;
    jsdPublic: true;
};

type AtlassianDocumentFormat = any;
