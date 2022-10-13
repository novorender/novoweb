import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { Space } from "./types";

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
};

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
    },
});

export const selectJiraAccessToken = (state: RootState) => state.jira.accessToken;
export const selectOAuthCode = (state: RootState) => state.jira.oAuthCode;
export const selectJiraSpace = (state: RootState) => state.jira.space;
export const selectAvailableJiraSpaces = (state: RootState) => state.jira.availableSpaces;

const { actions, reducer } = jiraSlice;
export { actions as jiraActions, reducer as jiraReducer };
