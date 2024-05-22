export type ProjectInfo = {
    id: string;
    name: string;
    description: string;
    viewCount: number;
    epsg: string;
    bounds: [number, number, number, number];
    permissions: string[];
    created: string;
    modified: string;
};

export type BuildProgressResult = {
    complete: boolean;
    position: number;
    text?: number;
    filesToProcess?: number;
};

export type EpsgSearchResult = {
    results: EpsgEntry[];
    total: number;
};

export type EpsgEntry = { id: string; name: string };

export type ProjectVersion = {
    id: string;
    created: string;
    url?: string;
    size?: number;
};
