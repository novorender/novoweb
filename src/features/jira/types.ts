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
