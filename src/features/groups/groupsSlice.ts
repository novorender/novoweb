import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "app/store";

export enum GroupsStatus {
    Initial,
    Unsaved,
    Saving,
    Deleting,
    RenamingGroup,
    RenamingGroupCollection,
    Error,
}

const initialState = {
    loadingIds: false,
    status: GroupsStatus.Initial as
        | Exclude<GroupsStatus, GroupsStatus.Deleting>
        | [status: GroupsStatus.Deleting, id: string]
        | [status: GroupsStatus.RenamingGroup, currentName: string, id: string]
        | [status: GroupsStatus.RenamingGroupCollection, currentName: string],
};

type State = typeof initialState;

export const groupsSlice = createSlice({
    name: "groups",
    initialState: initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setLoadingIds: (state, action: PayloadAction<State["loadingIds"]>) => {
            state.loadingIds = action.payload;
        },
    },
});

export const selectGroupsStatus = (state: RootState) => state.groups.status;
export const selectLoadingIds = (state: RootState) => state.groups.loadingIds;

const { actions, reducer } = groupsSlice;
export { actions as groupsActions, reducer as groupsReducer };
