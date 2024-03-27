import { MeasureEntity, MeasureSettings } from "@novorender/api";

export enum AsyncStatus {
    Initial,
    Loading,
    Success,
    Error,
}

export type AsyncEmpty = { status: Exclude<AsyncStatus, AsyncStatus.Success | AsyncStatus.Error> };
export type AsyncError = { status: AsyncStatus.Error; msg: string; stack?: string };
export type AsyncSuccess<T> = { status: AsyncStatus.Success; data: T };
export type AsyncState<T> = AsyncEmpty | AsyncError | AsyncSuccess<T>;

export function hasFinished<T>(state: AsyncState<T>): state is AsyncError | AsyncSuccess<T> {
    return state.status === AsyncStatus.Success || state.status === AsyncStatus.Error;
}

export function getAsyncStateData<T>(state: AsyncState<T>): T | undefined {
    if (state.status !== AsyncStatus.Success) {
        return;
    }

    return state.data;
}

export type ExtendedMeasureEntity = MeasureEntity & {
    settings?: MeasureSettings;
};

export enum ViewMode {
    Default = "default",
    FollowPath = "followPath",
    CrossSection = "crossSection",
    Panorama = "panorama",
}

export type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };

// the NodeType in api does not work with --isolatedModules
export const NodeType = {
    Internal: 0,
    Leaf: 1,
};

// Redux toolkit with immer removes readonly modifier of state in the reducer so we get ts errors
// unless we cast the types to writable ones.
export type DeepMutable<T> = { -readonly [P in keyof T]: DeepMutable<T[P]> };
