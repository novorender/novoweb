import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AuthInfo, User } from "types/bcf";

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

export enum BimTrackStatus {
    Initial,
    LoadingAuthInfo,
    Ready,
}

const initialState = {
    status: BimTrackStatus.Initial,
    accessToken: "",
    authInfo: undefined as AuthInfo | undefined,
    user: undefined as User | undefined,
    filters: {
        [FilterType.Type]: [] as string[],
        [FilterType.Label]: [] as string[],
        [FilterType.Status]: [] as string[],
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

type State = typeof initialState;
export type Filters = State["filters"];
export type FilterModifiers = State["filterModifiers"];

export const bimTrackSlice = createSlice({
    name: "bimTrack",
    initialState: initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setAccessToken: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<Filters>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setFilterModifiers: (state, action: PayloadAction<FilterModifiers>) => {
            state.filterModifiers = action.payload;
        },
        resetFilters: (state) => {
            state.filters = initialFilters;
            state.filterModifiers = initialFilterModifiers;
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

export const selectAccessToken = (state: RootState) => state.bimTrack.accessToken;
export const selectFilters = (state: RootState) => state.bimTrack.filters;
export const selectFilterModifiers = (state: RootState) => state.bimTrack.filterModifiers;
export const selectUser = (state: RootState) => state.bimTrack.user;
export const selectAuthInfo = (state: RootState) => state.bimTrack.authInfo;
export const selectStatus = (state: RootState) => state.bimTrack.status;

const { actions, reducer } = bimTrackSlice;
export { actions as bimTrackActions, reducer as bimTrackReducer };
