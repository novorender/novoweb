declare module "@novorender/data-js-api" {
    interface Bookmark {
        followPath?: {
            id: number;
            profile: number;
            currentCenter?: [number, number, number];
        };
    }
}
