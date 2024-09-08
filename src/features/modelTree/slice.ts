import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { AsyncStatus } from "types/misc";

const initialState = {
    searchStatus: AsyncStatus.Initial,
};

type State = typeof initialState;

export const propertyTreeSlice = createSlice({
    name: "modelTree",
    initialState: initialState,
    reducers: {
        setSearchStatus: (state, action: PayloadAction<State["searchStatus"]>) => {
            state.searchStatus = action.payload;
        },
    },
});

export const selectIsModelTreeLoading = (state: RootState) => state.modelTree.searchStatus === AsyncStatus.Loading;

const { actions, reducer } = propertyTreeSlice;
export { reducer as modelTreeReducer, actions as modelTreeActions };
