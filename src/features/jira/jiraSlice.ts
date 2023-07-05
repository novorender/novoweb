import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { initScene } from "features/render";

import { Component, CurrentUser, IssueType, Project, Space } from "./types";

export enum JiraFilterType {
    AssignedToMe = "assignedToMe",
    ReportedByMe = "reportedByMe",
    Unresolved = "unresolved",
}

export const initialFilters = {
    [JiraFilterType.AssignedToMe]: true,
    [JiraFilterType.ReportedByMe]: true,
    [JiraFilterType.Unresolved]: true,
};

const initialState = {
    config: { space: "", project: "", component: "" },
    space: undefined as undefined | Space,
    project: undefined as undefined | Project,
    component: undefined as undefined | Component,
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    prevAccessToken: "",
    refreshToken: undefined as undefined | { token: string; refreshIn: number },
    issueType: undefined as undefined | IssueType,
    user: undefined as undefined | CurrentUser,
    filters: initialFilters,
};

type State = typeof initialState;

export const jiraSlice = createSlice({
    name: "jira",
    initialState: initialState,
    reducers: {
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            if (action.payload.status === AsyncStatus.Success) {
                state.prevAccessToken = action.payload.data;
            }
            state.accessToken = action.payload;
        },
        setRefreshToken: (state, action: PayloadAction<State["refreshToken"]>) => {
            state.refreshToken = action.payload;
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
        setFilters: (state, action: PayloadAction<Partial<State["filters"]>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;
        },
        clearFilters: (state) => {
            state.filters = {
                [JiraFilterType.AssignedToMe]: false,
                [JiraFilterType.ReportedByMe]: false,
                [JiraFilterType.Unresolved]: false,
            };
        },
        logOut: () => {
            return initialState;
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const props = action.payload.sceneData.customProperties;

            if (props.integrations?.jira) {
                state.config = props.integrations.jira;
            } else if (props.jiraSettings) {
                state.config = props.jiraSettings;
            }
        });
    },
});

export const selectJiraRefreshToken = (state: RootState) => state.jira.refreshToken;
export const selectJiraAccessToken = (state: RootState) => state.jira.accessToken;
export const selectJiraAccessTokenData = (state: RootState) =>
    state.jira.accessToken.status === AsyncStatus.Success ? state.jira.accessToken.data : state.jira.prevAccessToken;
export const selectJiraSpace = (state: RootState) => state.jira.space;
export const selectJiraProject = (state: RootState) => state.jira.project;
export const selectJiraComponent = (state: RootState) => state.jira.component;
export const selectJiraUser = (state: RootState) => state.jira.user;
export const selectJiraIssueType = (state: RootState) => state.jira.issueType;
export const selectJiraFilters = (state: RootState) => state.jira.filters;
export const selectJiraConfig = (state: RootState) => state.jira.config;

const { actions, reducer } = jiraSlice;
export { actions as jiraActions, reducer as jiraReducer };
