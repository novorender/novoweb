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
