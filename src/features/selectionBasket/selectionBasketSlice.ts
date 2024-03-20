import { createSlice } from "@reduxjs/toolkit";

import { RootState } from "app";

const initialState = {
    flyOnSelect: true,
};

export const selectionBasketSlice = createSlice({
    name: "selectionBasket",
    initialState: initialState,
    reducers: {
        toggleFlyOnSelect: (state) => {
            state.flyOnSelect = !state.flyOnSelect;
        },
    },
});

export const selectFlyOnSelect = (state: RootState) => state.selectionBasket.flyOnSelect;

const { actions, reducer } = selectionBasketSlice;
export { reducer as selectionBasketReducer, actions as selectionBasketSliceActions };
