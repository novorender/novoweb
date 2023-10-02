import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { VecRGB } from "utils/color";

export interface OutlineGroup {
    name: string;
    color: VecRGB;
    hidden: boolean;
    ids: number[];
}

const initialState = {
    outlineGroups: [] as OutlineGroup[],
};

type State = typeof initialState;

export const clippingOutlineSlice = createSlice({
    name: "clippingOutline",
    initialState: initialState,
    reducers: {
        setOutlineGroups: (state, action: PayloadAction<State["outlineGroups"]>) => {
            state.outlineGroups = action.payload;
        },
    },
});

export const selectOutlineGroups = (state: RootState) => state.clippingOutline.outlineGroups;

const { actions, reducer } = clippingOutlineSlice;
export { actions as clippingOutlineActions, reducer as clippingOutlineReducer };
