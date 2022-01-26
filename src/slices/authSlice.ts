import { AccountInfo } from "@azure/msal-common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { getFromStorage } from "utils/storage";

export enum SceneAuthRequirement {
    Unknown,
    RequireAuth,
    AllowUnAuthenticated,
}

type User = { name: string; organization: string; role: string | undefined; features: any };

const initialState = {
    accessToken: getFromStorage(StorageKey.NovoToken),
    msalAccount: null as null | AccountInfo,
    user: undefined as undefined | User,
};

type State = typeof initialState;

export const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        login: (state, action: PayloadAction<{ accessToken: string; msalAccount?: AccountInfo | null }>) => {
            state.accessToken = action.payload.accessToken;

            if (action.payload.msalAccount) {
                state.msalAccount = action.payload.msalAccount;
            }
        },
        logout: () => {
            return { msalAccount: null, accessToken: "", user: undefined };
        },
        setUser: (state, action: PayloadAction<State["user"]>) => {
            state.user = action.payload;
        },
    },
});

export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectMsalAccount = (state: RootState) => state.auth.msalAccount;
export const selectUser = (state: RootState) => state.auth.user;

const { actions, reducer } = authSlice;
export { actions as authActions, reducer as authReducer };
