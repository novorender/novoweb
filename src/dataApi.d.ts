declare module "@novorender/data-js-api" {
    interface Bookmark {
        followPath?: Bookmark["followPath"] & { currentCenter?: [number, number, number] };
    }
}
