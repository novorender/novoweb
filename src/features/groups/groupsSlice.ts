import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncStatus } from "types/misc";

const initialState = {
    loadingIds: false,
    saveStatus: AsyncStatus.Initial,
    expandedCollections: [] as string[],
    highlightGroupInWidget: null as string | null,
    isEditingGroups: false,
    groupsSelectedForEdit: [] as string[],
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
                collection.startsWith(from) ? collection.replace(from, to) : collection,
            );
        },
        setHighlightGroupInWidget: (state, action: PayloadAction<string | null>) => {
            state.highlightGroupInWidget = action.payload;
        },
        setEditingGroups: (state, action: PayloadAction<State["isEditingGroups"]>) => {
            state.isEditingGroups = action.payload;
        },
        setGroupsSelectedForEdit: (state, action: PayloadAction<State["groupsSelectedForEdit"]>) => {
            state.groupsSelectedForEdit = action.payload;
        },
        toggleGroupSelectedForEdit: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (state.groupsSelectedForEdit.includes(id)) {
                state.groupsSelectedForEdit = state.groupsSelectedForEdit.filter((id2) => id2 !== id);
            } else {
                state.groupsSelectedForEdit.push(id);
            }
        },
        addGroupsSelectedForEdit: (state, action: PayloadAction<string[]>) => {
            const ids = action.payload;
            state.groupsSelectedForEdit = Array.from(new Set([...state.groupsSelectedForEdit, ...ids]));
        },
        removeGroupsSelectedForEdit: (state, action: PayloadAction<string[]>) => {
            const ids = action.payload;
            state.groupsSelectedForEdit = state.groupsSelectedForEdit.filter((id) => !ids.includes(id));
        },
    },
});

export const selectSaveStatus = (state: RootState) => state.groups.saveStatus;
export const selectLoadingIds = (state: RootState) => state.groups.loadingIds;
export const selectExpandedCollections = (state: RootState) => state.groups.expandedCollections;
export const selectHighlightGroupInWidget = (state: RootState) => state.groups.highlightGroupInWidget;
export const selectIsEditingGroups = (state: RootState) => state.groups.isEditingGroups;
export const selectGroupsSelectedForEditArray = (state: RootState) => state.groups.groupsSelectedForEdit;
export const selectGroupsSelectedForEdit = createSelector(selectGroupsSelectedForEditArray, (a) => new Set(a));

export const selectIsCollectionExpanded = createSelector(
    [selectExpandedCollections, (_state, collection: string) => collection],
    (collections, collection) => collections.includes(collection),
);

const { actions, reducer } = groupsSlice;
export { actions as groupsActions, reducer as groupsReducer };
