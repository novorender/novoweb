import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "app/store";

import { AuthInfo, User } from "./types";

export enum FilterType {
    Type = "topic_type",
    Status = "topic_status",
    Label = "labels",
    Priority = "priority",
    Stage = "stage",
    AssignedTo = "assigned_to",
    CreatedBy = "creation_author",
    Deadline = "due_date",
}

export enum FilterModifier {
    DeadlineOperator = "deadlineOperator",
}

const initialState = {
    accessToken: "",
    space: "",
    version: "",
    authInfo: undefined as AuthInfo | undefined,
    user: undefined as User | undefined,
    filters: {
        [FilterType.Type]: [] as string[],
        [FilterType.Label]: [] as string[],
        [FilterType.Status]: ["Active"] as string[],
        [FilterType.Priority]: [] as string[],
        [FilterType.Stage]: [] as string[],
        [FilterType.CreatedBy]: [] as string[],
        [FilterType.AssignedTo]: [] as string[],
        [FilterType.Deadline]: "",
    },
    filterModifiers: {
        [FilterModifier.DeadlineOperator]: "=" as "=" | ">=" | "<=",
    },
};

export const initialFilters = initialState.filters;
export const initialFilterModifiers = initialState.filterModifiers;
export type Filters = typeof initialFilters;
export type FilterModifiers = typeof initialFilterModifiers;

export const bimCollabSlice = createSlice({
    name: "bimCollab",
    initialState: initialState,
    reducers: {
        setSpace: (state, action: PayloadAction<string>) => {
            state.space = action.payload;
        },
        setVersion: (state, action: PayloadAction<string>) => {
            state.version = action.payload;
        },
        setAccessToken: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload;
        },
        setFilters: (state, action: PayloadAction<Filters>) => {
            state.filters = action.payload;
        },
        setFilterModifiers: (state, action: PayloadAction<FilterModifiers>) => {
            state.filterModifiers = action.payload;
        },
        setUser: (state, action: PayloadAction<User | undefined>) => {
            state.user = action.payload;
        },
        setAuthInfo: (state, action: PayloadAction<AuthInfo | undefined>) => {
            state.authInfo = action.payload;
        },
        logOut: () => {
            return initialState;
        },
    },
});

export const selectAccessToken = (state: RootState) => state.bimCollab.accessToken;
export const selectSpace = (state: RootState) => state.bimCollab.space;
export const selectVersion = (state: RootState) => state.bimCollab.version;
export const selectFilters = (state: RootState) => state.bimCollab.filters;
export const selectFilterModifiers = (state: RootState) => state.bimCollab.filterModifiers;
export const selectUser = (state: RootState) => state.bimCollab.user;
export const selectAuthInfo = (state: RootState) => state.bimCollab.authInfo;

const { actions, reducer } = bimCollabSlice;
export { actions as bimCollabActions, reducer as bimCollabReducer };
