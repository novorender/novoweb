import { MeasureEntity, MeasureSettings } from "@novorender/measure-api";

export enum AsyncStatus {
    Initial,
    Loading,
    Success,
    Error,
}

export type AsyncEmpty = { status: Exclude<AsyncStatus, AsyncStatus.Success | AsyncStatus.Error> };
export type AsyncError = { status: AsyncStatus.Error; msg: string };
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
