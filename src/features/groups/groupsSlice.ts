import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncStatus } from "types/misc";

const initialState = {
    loadingIds: false,
    saveStatus: AsyncStatus.Initial,
    expandedCollections: [] as string[],
};

type State = typeof initialState;

export const groupsSlice = createSlice({
    name: "groups",
    initialState: initialState,
    reducers: {
        setSaveStatus: (state, action: PayloadAction<State["saveStatus"]>) => {
            state.saveStatus = action.payload;
        },
        setLoadingIds: (state, action: PayloadAction<State["loadingIds"]>) => {
            state.loadingIds = action.payload;
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

export const selectSaveStatus = (state: RootState) => state.groups.saveStatus;
export const selectLoadingIds = (state: RootState) => state.groups.loadingIds;
export const selectExpandedCollections = (state: RootState) => state.groups.expandedCollections;

export const selectIsCollectionExpanded = createSelector(
    [selectExpandedCollections, (_state, collection: string) => collection],
    (collections, collection) => collections.includes(collection)
);

const { actions, reducer } = groupsSlice;
export { actions as groupsActions, reducer as groupsReducer };
