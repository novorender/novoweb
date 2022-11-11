import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { Component, CurrentUser, IssueType, Project, Space } from "./types";

const initialState = {
    space: undefined as undefined | Space,
    project: undefined as undefined | Project,
    component: undefined as undefined | Component,
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    issueType: undefined as undefined | IssueType,
    user: undefined as undefined | CurrentUser,
};

type State = typeof initialState;

export const jiraSlice = createSlice({
    name: "jira",
    initialState: initialState,
    reducers: {
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
        setSpace: (state, action: PayloadAction<State["space"]>) => {
            state.space = action.payload;
        },
        setProject: (state, action: PayloadAction<State["project"]>) => {
            state.project = action.payload;
        },
        setComponent: (state, action: PayloadAction<State["component"]>) => {
            state.component = action.payload;
        },
        setIssueType: (state, action: PayloadAction<State["issueType"]>) => {
            state.issueType = action.payload;
        },
        setUser: (state, action: PayloadAction<State["user"]>) => {
            state.user = action.payload;
        },
        logOut: () => {
            return initialState;
        },
    },
});

export const selectJiraAccessToken = (state: RootState) => state.jira.accessToken;
export const selectJiraAccessTokenData = createSelector(selectJiraAccessToken, (token) =>
    token.status === AsyncStatus.Success ? token.data : ""
);
export const selectJiraSpace = (state: RootState) => state.jira.space;
export const selectJiraProject = (state: RootState) => state.jira.project;
export const selectJiraComponent = (state: RootState) => state.jira.component;
export const selectJiraUser = (state: RootState) => state.jira.user;
export const selectIssueType = (state: RootState) => state.jira.issueType;

const { actions, reducer } = jiraSlice;
export { actions as jiraActions, reducer as jiraReducer };
