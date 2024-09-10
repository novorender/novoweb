import { ObjectGroup } from "@novorender/data-js-api";

import { CustomProperties } from "types/project";

import { Permission } from "./permissions";

export type ProjectInfo = {
    id: string;
    name: string;
    description: string;
    viewCount: number;
    epsg: string;
    bounds: [number, number, number, number];
    permissions: Permission[];
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

export type SceneData = {
    customProperties: CustomProperties;
    objectGroups: ObjectGroup[];
};
