import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncStatus } from "types/misc";

const initialState = {
    status: AsyncStatus.Initial,
    apiKey: "",
};

type State = typeof initialState;

export const omega365Slice = createSlice({
    name: "omega365",
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

export const selectOmega365ApiKey = (state: RootState) => state.omega365.apiKey;
export const selectOmega365Status = (state: RootState) => state.omega365.status;

const { actions, reducer } = omega365Slice;
export { actions as omega365Actions, reducer as omega365Reducer };
