import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

type State = typeof initialState;

const initialState = {
    asset: "" as string,
};

export const assetSlice = createSlice({
    name: "asset",
    initialState: initialState,
    reducers: {
        setAsset: (state, action: PayloadAction<State["asset"]>) => {
            state.asset = action.payload;
        },
    },
});

export const selectAsset = (state: RootState) => state.asset.asset;

const { actions, reducer } = assetSlice;
export { actions as assetActions, reducer as assetReducer };
