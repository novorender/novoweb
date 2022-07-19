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
