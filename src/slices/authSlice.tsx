import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    ssoRedirect: false,
};

export const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        setSsoRedirect: (state, action: PayloadAction<boolean>) => {
            state.ssoRedirect = action.payload;
        },
    },
});

const { actions, reducer } = authSlice;
export { actions as authActions, reducer as authReducer };
