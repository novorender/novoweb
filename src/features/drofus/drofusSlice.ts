import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { getFromStorage } from "utils/storage";

const initialState = {
    accessToken: getFromStorage(StorageKey.DrofusAccessToken),
};

type State = typeof initialState;

export const drofusSlice = createSlice({
    name: "drofus",
    initialState: initialState,
    reducers: {
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
    },
});

export const selectAccessToken = (state: RootState) => state.drofus.accessToken;

const { actions, reducer } = drofusSlice;
export { actions as drofusActions, reducer as drofusReducer };
