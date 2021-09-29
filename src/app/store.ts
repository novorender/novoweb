import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import { renderReducer } from "slices/renderSlice";
import { explorerReducer } from "slices/explorerSlice";
import { authReducer } from "slices/authSlice";

const rootReducer = combineReducers({
    explorer: explorerReducer,
    render: renderReducer,
    auth: authReducer,
});

export const store = configureStore({ reducer: rootReducer, devTools: process.env.NODE_ENV === "development" });

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
