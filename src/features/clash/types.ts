import { ReadonlyVec3 } from "gl-matrix";

export type ClashProfile = {
    id: string;
    name: string;
};

export type Clash = {
    objIds: [number, number];
    clashPoint: ReadonlyVec3;
};

export type ClashResultFile = {
    version: string;
    lastRun: string;
    clashes: ClashProfile[];
};

export type ClashListFile = {
    name: string;
    clashes: Clash[];
};
