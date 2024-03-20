import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { initScene } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

import { Component, CurrentUser, IssueType, Project, Space } from "./types";

export enum JiraFilterType {
    AssignedToMe = "assignedToMe",
    ReportedByMe = "reportedByMe",
    Unresolved = "unresolved",
    Linked = "linked",
}

export const initialFilters = {
    [JiraFilterType.AssignedToMe]: true,
    [JiraFilterType.ReportedByMe]: true,
    [JiraFilterType.Unresolved]: true,
    [JiraFilterType.Linked]: true,
};

const initialState = {
    config: { space: "", project: "", component: "" },
    space: undefined as undefined | Space,
    project: undefined as undefined | Project,
    component: undefined as undefined | Component,
    metaCustomfieldKey: "",
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    prevAccessToken: "",
    refreshToken: undefined as undefined | { token: string; refreshIn: number },
    issueType: undefined as undefined | IssueType,
    user: undefined as undefined | CurrentUser,
    filters: initialFilters,
    markers: {
        show: true,
        issueTypes: { "10004": { icon: "build" } } as {
            [issueTypeId: string]:
                | {
                      icon: string;
                  }
                | undefined;
        },
    },
    clickedMarker: "",
    lastViewedPath: "/",
    activeIssue: "",
    hoveredEntity: "",
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
        setMetaCustomfieldKey: (state, action: PayloadAction<State["metaCustomfieldKey"]>) => {
            state.metaCustomfieldKey = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<State["filters"]>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;
        },
        toggleShowMarkers: (state, action: PayloadAction<State["markers"]["show"] | undefined>) => {
            if (action.payload === undefined) {
                state.markers.show = !state.markers.show;
            } else {
                state.markers.show = action.payload;
            }
        },
        setMarkersConfig: (state, action: PayloadAction<Partial<State["markers"]>>) => {
            state.markers = { ...state.markers, ...action.payload };
        },
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setClickedMarker: (state, action: PayloadAction<State["clickedMarker"]>) => {
            state.clickedMarker = action.payload;
        },
        setActiveIssue: (state, action: PayloadAction<State["activeIssue"]>) => {
            state.activeIssue = action.payload;
        },
        setHoveredEntity: (state, action: PayloadAction<State["hoveredEntity"]>) => {
            state.hoveredEntity = action.payload;
        },
        clearFilters: (state) => {
            state.filters = {
                [JiraFilterType.AssignedToMe]: false,
                [JiraFilterType.ReportedByMe]: false,
                [JiraFilterType.Unresolved]: false,
                [JiraFilterType.Linked]: true,
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
                const { markers, ...baseConfig } = props.integrations.jira;
                state.config = baseConfig;
                state.markers = { ...state.markers, ...markers };
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
export const selectMetaCustomfieldKey = (state: RootState) => state.jira.metaCustomfieldKey;
export const selectJiraShowMarkers = (state: RootState) => state.jira.markers.show;
export const selectJiraMarkersConfig = (state: RootState) => state.jira.markers;
export const selectJiraClickedMarker = (state: RootState) => state.jira.clickedMarker;
export const selectJiraLastViewedPath = (state: RootState) => state.jira.lastViewedPath;
export const selectJiraActiveIssue = (state: RootState) => state.jira.activeIssue;
export const selectJiraHoveredEntity = (state: RootState) => state.jira.hoveredEntity;

const { actions, reducer } = jiraSlice;
export { actions as jiraActions, reducer as jiraReducer };
