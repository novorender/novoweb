import { AccountInfo } from "@azure/msal-common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

export enum SceneAuthRequirement {
    Unknown,
    RequireAuth,
    AllowUnAuthenticated,
}

export type User = {
    user: string;
    organization: string;
    role: string | undefined;
    features: {
        [k: string]: Record<string, boolean | undefined> | boolean | undefined;
        render?: { full: boolean };
        debugInfo?: {
            quality?: boolean;
            boundingBoxes?: boolean;
            holdDynamic?: boolean;
            render?: boolean;
        };
        doubleSided?: boolean;
        bakeResources?: boolean;
        vr?: boolean;
    };
};

const initialState = {
    accessToken: "",
    msalAccount: null as null | AccountInfo,
    adTenant: "",
    user: undefined as undefined | User,
};

type State = typeof initialState;

export const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        login: (
            state,
            action: PayloadAction<{ accessToken: string; user: User; msalAccount?: AccountInfo | null }>
        ) => {
            state.accessToken = action.payload.accessToken;
            state.user = action.payload.user;

            if (action.payload.msalAccount) {
                state.msalAccount = action.payload.msalAccount;
            }
        },
        logout: (state) => {
            return { ...state, msalAccount: null, accessToken: "", user: undefined };
        },
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
        setUser: (state, action: PayloadAction<State["user"]>) => {
            state.user = action.payload;
        },
        setAdTenant: (state, action: PayloadAction<State["adTenant"]>) => {
            state.adTenant = action.payload;
        },
    },
});

export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectMsalAccount = (state: RootState) => state.auth.msalAccount;
export const selectUser = (state: RootState) => state.auth.user;
export const selectAdTentant = (state: RootState) => state.auth.adTenant;

const { actions, reducer } = authSlice;
export { actions as authActions, reducer as authReducer };
