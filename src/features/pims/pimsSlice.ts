import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncStatus } from "types/misc";

const initialState = {
    status: AsyncStatus.Initial,
    apiKey: "",
};

type State = typeof initialState;

export const pimsSlice = createSlice({
    name: "pims",
    initialState: initialState,
    reducers: {
        setApiKey: (state, action: PayloadAction<State["apiKey"]>) => {
            state.apiKey = action.payload;
        },
        setStatus: (state, action: PayloadAction<State["status"]>) => {
            state.status = action.payload;
        },
        logout: () => {
            return initialState;
        },
    },
});

export const selectPimsApiKey = (state: RootState) => state.pims.apiKey;
export const selectPimsStatus = (state: RootState) => state.pims.status;

const { actions, reducer } = pimsSlice;
export { actions as pimsActions, reducer as pimsReducer };
