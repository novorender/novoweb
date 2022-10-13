import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { AsyncState, AsyncStatus } from "types/misc";
import { getFromStorage } from "utils/storage";
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

const storedToken = getFromStorage(StorageKey.JiraAccessToken);

const initialState = {
    oAuthCode: new URLSearchParams(window.location.search).get("code"),
    space: { status: AsyncStatus.Initial } as AsyncState<Space>,
    accessToken: (storedToken
        ? { status: AsyncStatus.Success, data: storedToken }
        : { status: AsyncStatus.Initial }) as AsyncState<string>,
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
        setCloudId: (state, action: PayloadAction<State["space"]>) => {
            state.space = action.payload;
        },
        deleteOAuthCode: (state) => {
            state.oAuthCode = "";
        },
    },
});

export const selectJiraAccessToken = (state: RootState) => state.jira.accessToken;
export const selectOAuthCode = (state: RootState) => state.jira.oAuthCode;
export const selectJiraSpace = (state: RootState) => state.jira.space;

const { actions, reducer } = jiraSlice;
export { actions as jiraActions, reducer as jiraReducer };
