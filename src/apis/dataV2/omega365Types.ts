export type Omega365DynamicDocument = { [key: string]: string | number };

export type Omega365Configuration = {
    baseURL: string;
    views: Omega365View[];
};

export enum RequestedType {
    Resource = "resource",
    View = "view",
}

export type Omega365View = {
    id: string;
    requestedType: RequestedType;
    viewOrResourceName: string;
    title: string;
    whereClause: string;
    groupBy?: string;
    fields: Omega365ViewField[];
};

export type Omega365ViewField = {
    title: string;
    name: string;
    type: Omega365ViewFieldType;
};

export enum Omega365ViewFieldType {
    Text = "text",
    Link = "link",
    File = "file",
    Hidden = "hidden",
}
