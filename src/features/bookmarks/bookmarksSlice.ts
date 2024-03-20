import { Bookmark } from "@novorender/data-js-api";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app";

export enum BookmarksStatus {
    Initial,
    Loading,
    Running,
    Error,
    Saving,
}

export enum BookmarkAccess {
    Public,
    Personal,
}

export type ExtendedBookmark = Bookmark & { access: BookmarkAccess };

const initialState = {
    status: BookmarksStatus.Initial,
    bookmarks: [] as ExtendedBookmark[],
    filters: {
        title: "",
        measurements: false,
        clipping: false,
        groups: false,
        personal: false,
        public: false,
    },
    expandedCollections: [] as string[],
};

type State = typeof initialState;
export type Filters = State["filters"];

export const bookmarksSlice = createSlice({
    name: "bookmarks",
    initialState: initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<State["filters"]>>) => {
            state.filters = {
                ...state.filters,
                ...action.payload,
            };
        },
        toggleFilter: (state, action: PayloadAction<Exclude<keyof State["filters"], "title">>) => {
            state.filters[action.payload] = !state.filters[action.payload];
        },
        setBookmarks: (state, action: PayloadAction<ExtendedBookmark[]>) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            state.bookmarks = action.payload as any;
        },
        resetState: () => {
            return initialState;
        },
        expandCollection: (state, action: PayloadAction<string>) => {
            state.expandedCollections = state.expandedCollections.concat(action.payload);
        },
        closeCollection: (state, action: PayloadAction<string>) => {
            state.expandedCollections = state.expandedCollections.filter((collection) => collection !== action.payload);
        },
        renameExpandedCollection: (state, { payload: { from, to } }: PayloadAction<{ from: string; to: string }>) => {
            state.expandedCollections = state.expandedCollections.map((collection) =>
                collection.startsWith(from) ? collection.replace(from, to) : collection
            );
        },
    },
});

export const selectBookmarksStatus = (state: RootState) => state.bookmarks.status;
export const selectBookmarkFilters = (state: RootState) => state.bookmarks.filters;
export const selectBookmarks = (state: RootState) => state.bookmarks.bookmarks;
export const selectExpandedCollections = (state: RootState) => state.bookmarks.expandedCollections;

export const selectIsCollectionExpanded = createSelector(
    [selectExpandedCollections, (_state, collection: string) => collection],
    (collections, collection) => collections.includes(collection)
);

const { actions, reducer } = bookmarksSlice;
export { actions as bookmarksActions, reducer as bookmarksReducer };
