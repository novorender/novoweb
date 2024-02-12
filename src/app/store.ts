import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { dataV2Api } from "apis/dataV2/dataV2Api";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import { areaReducer } from "features/area";
import { bimCollabApi, bimCollabReducer } from "features/bimCollab";
import { bimTrackApi, bimTrackReducer } from "features/bimTrack";
import { bookmarksReducer } from "features/bookmarks";
import { deviationsReducer } from "features/deviations";
import { ditioApi } from "features/ditio";
import { ditioReducer } from "features/ditio";
import { followPathReducer } from "features/followPath";
import { groupsReducer } from "features/groups";
import { heightProfileReducer } from "features/heightProfile";
import { imagesReduces } from "features/images";
import { jiraApi, jiraReducer } from "features/jira";
import { manholeReducer } from "features/manhole";
import { measureReducer } from "features/measure";
import { myLocationReducer } from "features/myLocation";
import { offlineReducer } from "features/offline";
import { omega365Reducer } from "features/omega365";
import { orthoCamReducer } from "features/orthoCam";
import { clippingOutlineLaserReducer } from "features/outlineLaser";
import { pointLineReducer } from "features/pointLine";
import { propertiesReducer } from "features/properties/slice";
import { renderReducer } from "features/render/renderSlice";
import { selectionBasketReducer } from "features/selectionBasket";
import { xsiteManageApi, xsiteManageReducer } from "features/xsiteManage";
import { authReducer } from "slices/authSlice";
import { explorerReducer } from "slices/explorerSlice";

const rootReducer = combineReducers({
    explorer: explorerReducer,
    render: renderReducer,
    auth: authReducer,
    groups: groupsReducer,
    bookmarks: bookmarksReducer,
    images: imagesReduces,
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
    clippingOutline: clippingOutlineLaserReducer,
    selectionBasket: selectionBasketReducer,
    properties: propertiesReducer,
    offline: offlineReducer,
    omega365: omega365Reducer,
    [bimCollabApi.reducerPath]: bimCollabApi.reducer,
    bimTrack: bimTrackReducer,
    [bimTrackApi.reducerPath]: bimTrackApi.reducer,
    ditio: ditioReducer,
    [ditioApi.reducerPath]: ditioApi.reducer,
    jira: jiraReducer,
    [jiraApi.reducerPath]: jiraApi.reducer,
    xsiteManage: xsiteManageReducer,
    [xsiteManageApi.reducerPath]: xsiteManageApi.reducer,
    [dataV2Api.reducerPath]: dataV2Api.reducer,
});

export const store = configureStore({
    reducer: rootReducer,
    devTools: import.meta.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActionPaths: ["meta.arg", "meta.baseQueryMeta", "meta.view"],
            },
        })
            .concat(bimCollabApi.middleware)
            .concat(bimTrackApi.middleware)
            .concat(ditioApi.middleware)
            .concat(jiraApi.middleware)
            .concat(xsiteManageApi.middleware)
            .concat(dataV2Api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
