import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { dataV2Api } from "apis/dataV2/dataV2Api";
import { arcgisSlice } from "features/arcgis";
import { arcgisApi } from "features/arcgis/arcgisApi";
import { areaReducer } from "features/area";
import { bimCollabApi, bimCollabReducer } from "features/bimCollab";
import { bimTrackApi, bimTrackReducer } from "features/bimTrack";
import { bookmarksReducer } from "features/bookmarks";
import { clashReducer } from "features/clash";
import { clashApi } from "features/clash/clashApi";
import { crossSectionReducer } from "features/crossSection/slice";
import { deviationsReducer } from "features/deviations";
import { ditioApi } from "features/ditio";
import { ditioReducer } from "features/ditio";
import { followPathReducer } from "features/followPath";
import { formsApi, formsReducer } from "features/forms";
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
import { pimsReducer } from "features/pims";
import { pointLineReducer } from "features/pointLine";
import { pointVisualizationReducer } from "features/pointVisualization";
import { propertiesReducer } from "features/properties/slice";
import { propertyTreeApi, propertyTreeReducer } from "features/propertyTree";
import { renderReducer } from "features/render";
import { selectionBasketReducer } from "features/selectionBasket";
import { xsiteManageApi, xsiteManageReducer } from "features/xsiteManage";
import { authReducer } from "slices/authSlice";
import { explorerReducer } from "slices/explorer";

const rootReducer = combineReducers({
    explorer: explorerReducer,
    render: renderReducer,
    auth: authReducer,
    groups: groupsReducer,
    bookmarks: bookmarksReducer,
    images: imagesReduces,
    followPath: followPathReducer,
    forms: formsReducer,
    [formsApi.reducerPath]: formsApi.reducer,
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
    pims: pimsReducer,
    propertyTree: propertyTreeReducer,
    [propertyTreeApi.reducerPath]: propertyTreeApi.reducer,
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
    arcgis: arcgisSlice.reducer,
    omega365: omega365Reducer,
    [arcgisApi.reducerPath]: arcgisApi.reducer,
    [clashApi.reducerPath]: clashApi.reducer,
    clash: clashReducer,
    pointVisualization: pointVisualizationReducer,
    crossSection: crossSectionReducer,
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
            .concat(formsApi.middleware)
            .concat(jiraApi.middleware)
            .concat(xsiteManageApi.middleware)
            .concat(dataV2Api.middleware)
            .concat(propertyTreeApi.middleware)
            .concat(arcgisApi.middleware)
            .concat(clashApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
