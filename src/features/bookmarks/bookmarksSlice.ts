import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Bookmark } from "@novorender/data-js-api";

import { RootState } from "app/store";

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
            state.bookmarks = action.payload as any;
        },
        resetState: () => {
            return initialState;
        },
    },
});

export const selectBookmarksStatus = (state: RootState) => state.bookmarks.status;
export const selectBookmarkFilters = (state: RootState) => state.bookmarks.filters;
export const selectBookmarks = (state: RootState) => state.bookmarks.bookmarks;

const { actions, reducer } = bookmarksSlice;
export { actions as bookmarksActions, reducer as bookmarksReducer };
