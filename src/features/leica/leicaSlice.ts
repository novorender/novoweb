import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { getFromStorage } from "utils/storage";

export enum LeicaStatus {
    Initial,
    CheckingSession,
    LoadingCsrfToken,
    Unauthenticated,
    LoadingLogin,
    Authenticated,
    Error,
}

const initialState = {
    csrfToken: getFromStorage(StorageKey.LeicaCsrfToken),
    sessionId: getFromStorage(StorageKey.LeicaSessionId),
    accountId: "",
    projectId: "",
    status: LeicaStatus.Initial,
    error: "",
    lastViewedPath: "/",
};

type State = typeof initialState;

export const leicaSlice = createSlice({
    name: "leica",
    initialState: initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        setCsrfToken: (state, action: PayloadAction<State["csrfToken"]>) => {
            state.csrfToken = action.payload;
        },
        setSessionId: (state, action: PayloadAction<State["sessionId"]>) => {
            state.sessionId = action.payload;
        },
        setError: (state, action: PayloadAction<State["error"]>) => {
            state.status = LeicaStatus.Error;
            state.error = action.payload;
        },
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setAccountId: (state, action: PayloadAction<State["accountId"]>) => {
            state.accountId = action.payload;
        },
        setProjectId: (state, action: PayloadAction<State["projectId"]>) => {
            state.projectId = action.payload;
        },
    },
});

export const selectCsrfToken = (state: RootState) => state.leica.csrfToken;
export const selectSessionId = (state: RootState) => state.leica.sessionId;
export const selectStatus = (state: RootState) => state.leica.status;
export const selectLastViewedPath = (state: RootState) => state.leica.lastViewedPath;
export const selectAccountId = (state: RootState) => state.leica.accountId;
export const selectProjectId = (state: RootState) => state.leica.projectId;

const { actions, reducer } = leicaSlice;
export { actions as leicaActions, reducer as leicaReducer };
