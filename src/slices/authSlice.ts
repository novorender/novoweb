import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";

export enum SceneAuthRequirement {
    Unknown,
    RequireAuth,
    AllowUnAuthenticated,
}

export type User = {
    user: string;
    name?: string;
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
    user: undefined as undefined | User,
};

type State = typeof initialState;

export const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        login: (state, action: PayloadAction<{ accessToken: string; user: User }>) => {
            state.accessToken = action.payload.accessToken;
            state.user = action.payload.user;
        },
        setUser: (state, action: PayloadAction<State["user"]>) => {
            state.user = action.payload;
        },
    },
});

export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectUser = (state: RootState) => state.auth.user;

const { actions, reducer } = authSlice;
export { actions as authActions, reducer as authReducer };
