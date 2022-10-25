import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { IssueType, Space } from "./types";

export enum JiraStatus {
    Initial,
    CheckingSession,
    LoadingCsrfToken,
    Unauthenticated,
    LoadingLogin,
    Authenticated,
    Error,
}

const initialState = {
    oAuthCode: new URLSearchParams(window.location.search).get("code"),
    space: undefined as undefined | Space,
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    availableSpaces: { status: AsyncStatus.Initial } as AsyncState<Space[]>,
    issueType: undefined as undefined | IssueType,
};

// TODO (flytt inn i jira component)
if (initialState.oAuthCode) {
    window.history.replaceState(null, "", window.location.pathname);
}

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
        setAvailableSpaces: (state, action: PayloadAction<State["availableSpaces"]>) => {
            state.availableSpaces = action.payload;
        },
        deleteOAuthCode: (state) => {
            state.oAuthCode = "";
        },
        setIssueType: (state, action: PayloadAction<State["issueType"]>) => {
            state.issueType = action.payload;
        },
    },
});

export const selectJiraAccessToken = (state: RootState) => state.jira.accessToken;
export const selectJiraAccessTokenData = createSelector(selectJiraAccessToken, (token) =>
    token.status === AsyncStatus.Success ? token.data : ""
);
export const selectOAuthCode = (state: RootState) => state.jira.oAuthCode;
export const selectJiraSpace = (state: RootState) => state.jira.space;
export const selectAvailableJiraSpaces = (state: RootState) => state.jira.availableSpaces;
export const selectIssueType = (state: RootState) => state.jira.issueType;

const { actions, reducer } = jiraSlice;
export { actions as jiraActions, reducer as jiraReducer };
