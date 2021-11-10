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

const initialState = {
    accessToken: getFromStorage(StorageKey.NovoToken),
    msalAccount: null as null | AccountInfo,
};

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
            return { msalAccount: null, accessToken: "" };
        },
    },
});

export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectMsalAccount = (state: RootState) => state.auth.msalAccount;

const { actions, reducer } = authSlice;
export { actions as authActions, reducer as authReducer };
