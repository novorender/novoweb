import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";

import { renderReducer } from "slices/renderSlice";
import { explorerReducer } from "slices/explorerSlice";
import { authReducer } from "slices/authSlice";
import { groupsReducer } from "features/groups";
import { bookmarksReducer } from "features/bookmarks";
import { panoramasReducer } from "features/panoramas";
import { followPathReducer } from "features/followPath";
import { deviationsReducer } from "features/deviations";
import { measureReducer } from "features/measure";
import { bimCollabReducer } from "features/bimCollab/bimCollabSlice";
import { bimCollabApi } from "features/bimCollab/bimCollabApi";
import { bimTrackReducer } from "features/bimTrack/bimTrackSlice";
import { bimTrackApi } from "features/bimTrack/bimTrackApi";

const rootReducer = combineReducers({
    explorer: explorerReducer,
    render: renderReducer,
    auth: authReducer,
    groups: groupsReducer,
    bookmarks: bookmarksReducer,
    panoramas: panoramasReducer,
    followPath: followPathReducer,
    deviations: deviationsReducer,
    measure: measureReducer,
    bimCollab: bimCollabReducer,
    [bimCollabApi.reducerPath]: bimCollabApi.reducer,
    bimTrack: bimTrackReducer,
    [bimTrackApi.reducerPath]: bimTrackApi.reducer,
});

export const store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(bimCollabApi.middleware).concat(bimTrackApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
