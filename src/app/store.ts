import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";

import { renderReducer } from "slices/renderSlice";
import { explorerReducer } from "slices/explorerSlice";
import { authReducer } from "slices/authSlice";
import { groupsReducer } from "features/groups";
import { bimCollabReducer } from "features/bimCollab/bimCollabSlice";
import { bimCollabApi } from "features/bimCollab/bimCollabApi";

const rootReducer = combineReducers({
    explorer: explorerReducer,
    render: renderReducer,
    auth: authReducer,
    groups: groupsReducer,
    bimCollab: bimCollabReducer,
    [bimCollabApi.reducerPath]: bimCollabApi.reducer,
});

export const store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(bimCollabApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
