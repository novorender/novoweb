import { vec3 } from "gl-matrix";

export type Site = {
    siteId: string;
    name: string;
    uiLongitude: number;
    uiLatitude: number;
};

enum LogPointType {
    SurveyPoint = "SurveyPoint",
    SurveyLinePoint = "SurveyLinePoint",
    AsbuiltPoint = "AsbuiltPoint",
    AsbuiltLinePoint = "AsbuiltLinePoint",
    AsbuiltSurfacePoint = "AsbuiltSurfacePoint",
    ControlPoint = "ControlPoint",
    UserPoint = "UserPoint",
    UserLinePoint = "UserLinePoint",
    UserMeshPoint = "UserMeshPoint",
    OffsetPoint = "OffsetPoint",
    OffsetLinePoint = "OffsetLinePoint",
    OffsetMeshPoint = "OffsetMeshPoint",
    UserStringLineLayer = "UserStringLineLayer",
    OffsetStringLineLayer = "OffsetStringLineLayer",
}

export type LogPoint = {
    machineId: string;
    siteId: string;
    timestampMs: number;
    localId: number;
    x: number;
    y: number;
    z: number;
    sequenceId: number;
    remoteId: number;
    abandoned: boolean;
    code?: string;
    machineType?: string;
    name?: string;
    description?: string;
    surfaceCode?: string;
    lineId?: string;
    groupId?: string;
    fillDepth?: number;
    centerLineId?: string;
    simulated?: boolean;
    staStart?: string;
    type?: LogPointType;
    lineIds?: string[];
    accuracy?: {
        h: number;
        v: number;
    };
    ref?: {
        name: string;
        filePath: string;
        code: string;
        dz: number;
        dh: number;
    };
    refRefLine?: {
        name: string;
        filePath: string;
        station: number;
        ds: number;
    };
    siteVersion?: number;
};

export type Machine = {
    siteId: string;
    machineId: string;
    name: string;
    inactiveTimestamp?: number;
};

export type MachineLocation = {
    latitude: number;
    longitude: number;
    machineId: string;
    siteId: string;
    timestampMs: number;
    position: vec3;
};
