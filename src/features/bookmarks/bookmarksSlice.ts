import { Bookmark } from "@novorender/data-js-api";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncState, AsyncStatus, DeepMutable } from "types/misc";

export enum BookmarkAccess {
    Public,
    Personal,
}

export type ExtendedBookmark = Bookmark & { access: BookmarkAccess };

const initialState = {
    initStatus: AsyncStatus.Initial,
    saveStatus: { status: AsyncStatus.Initial } as AsyncState<null | string>,
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
        setInitStatus: (state, action: PayloadAction<State["initStatus"]>) => {
            state.initStatus = action.payload;
        },
        setSaveStatus: (state, action: PayloadAction<State["saveStatus"]>) => {
            state.saveStatus = action.payload;
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
        setBookmarks: (state, action: PayloadAction<State["bookmarks"]>) => {
            state.bookmarks = action.payload as DeepMutable<State["bookmarks"]>;
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

export const selectSaveStatus = (state: RootState) => state.bookmarks.saveStatus;
export const selectBookmarkFilters = (state: RootState) => state.bookmarks.filters;
export const selectExpandedCollections = (state: RootState) => state.bookmarks.expandedCollections;
export const selectBookmarks = (state: RootState) => state.bookmarks.bookmarks;
export const selectBookmarksStatus = (state: RootState) => state.bookmarks.initStatus;

export const selectIsCollectionExpanded = createSelector(
    [selectExpandedCollections, (_state, collection: string) => collection],
    (collections, collection) => collections.includes(collection)
);

const { actions, reducer } = bookmarksSlice;
export { actions as bookmarksActions, reducer as bookmarksReducer };
