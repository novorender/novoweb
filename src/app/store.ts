import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";

import { renderReducer } from "features/render/renderSlice";
import { explorerReducer } from "slices/explorerSlice";
import { authReducer } from "slices/authSlice";
import { groupsReducer } from "features/groups";
import { bookmarksReducer } from "features/bookmarks";
import { panoramasReducer } from "features/panoramas";
import { followPathReducer } from "features/followPath";
import { deviationsReducer } from "features/deviations";
import { measureReducer } from "features/measure";
import { bimCollabReducer, bimCollabApi } from "features/bimCollab";
import { bimTrackReducer, bimTrackApi } from "features/bimTrack";
import { ditioReducer } from "features/ditio";
import { ditioApi } from "features/ditio";
import { areaReducer } from "features/area";
import { orthoCamReducer } from "features/orthoCam";
import { pointLineReducer } from "features/pointLine";
import { heightProfileReducer } from "features/heightProfile";
import { myLocationReducer } from "features/myLocation";
import { jiraApi, jiraReducer } from "features/jira";
import { manholeReducer } from "features/manhole";
import { selectionBasketReducer } from "features/selectionBasket";
import { xsiteManageReducer, xsiteManageApi } from "features/xsiteManage";

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
    area: areaReducer,
    orthoCam: orthoCamReducer,
    manhole: manholeReducer,
    pointLine: pointLineReducer,
    myLocation: myLocationReducer,
    bimCollab: bimCollabReducer,
    heightProfile: heightProfileReducer,
    selectionBasket: selectionBasketReducer,
    [bimCollabApi.reducerPath]: bimCollabApi.reducer,
    bimTrack: bimTrackReducer,
    [bimTrackApi.reducerPath]: bimTrackApi.reducer,
    ditio: ditioReducer,
    [ditioApi.reducerPath]: ditioApi.reducer,
    jira: jiraReducer,
    [jiraApi.reducerPath]: jiraApi.reducer,
    xsiteManage: xsiteManageReducer,
    [xsiteManageApi.reducerPath]: xsiteManageApi.reducer,
});

export const store = configureStore({
    reducer: rootReducer,
    devTools: import.meta.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(bimCollabApi.middleware)
            .concat(bimTrackApi.middleware)
            .concat(ditioApi.middleware)
            .concat(jiraApi.middleware)
            .concat(xsiteManageApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
