import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "app/store";

export enum GroupsStatus {
    Initial,
    Unsaved,
    Saving,
    Deleting,
    Error,
}

const initialState = {
    status: GroupsStatus.Initial as
        | Exclude<GroupsStatus, GroupsStatus.Deleting>
        | [status: GroupsStatus.Deleting, id: string],
};

type State = typeof initialState;

export const groupsSlice = createSlice({
    name: "groups",
    initialState: initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
    },
});

export const selectGroupsStatus = (state: RootState) => state.groups.status;

const { actions, reducer } = groupsSlice;
export { actions as groupsActions, reducer as groupsReducer };
