import { createApi } from "@reduxjs/toolkit/query/react";
import { minutesToSeconds } from "date-fns";

import { ArcgisWidgetConfig } from "features/arcgis";

import { Omega365Document } from "./omega365Types";
import { ProjectInfo } from "./projectTypes";
import { getDataV2DynamicBaseQuery } from "./utils";

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: getDataV2DynamicBaseQuery(),
    tagTypes: ["PropertyTreeFavorites"],
    endpoints: (builder) => ({
        isOmega365ConfiguredForProject: builder.query<{ configured: boolean }, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/configured`,
        }),
        getOmega365DocumentLinks: builder.query<Omega365Document[], { projectId: string; objectId: number }>({
            query: ({ projectId, objectId }) => `/explorer/${projectId}/omega365/documents/${objectId}`,
        }),
        getPropertyTreeFavorites: builder.query<string[], { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/propertytree/favorites`,
            keepUnusedDataFor: minutesToSeconds(10),
            providesTags: ["PropertyTreeFavorites"],
            transformResponse: (data: { propertyName: string }[]) => data.map(({ propertyName }) => propertyName),
        }),
        setPropertyTreeFavorites: builder.mutation<void, { favorites: string[]; projectId: string }>({
            query: ({ projectId, favorites }) => ({
                url: `/explorer/${projectId}/propertytree/favorites`,
                method: "PUT",
                body: favorites.map((propertyName) => ({ propertyName })),
            }),
            invalidatesTags: ["PropertyTreeFavorites"],
            async onQueryStarted({ favorites, projectId }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    dataV2Api.util.updateQueryData("getPropertyTreeFavorites", { projectId }, () => favorites)
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        getProject: builder.query<ProjectInfo, { projectId: string }>({
            query: ({ projectId }) => `/projects/${projectId}`,
        }),
        getArcgisWidgetConfig: builder.query<ArcgisWidgetConfig, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/arcgis/config`,
        }),
        putArcgisWidgetConfig: builder.mutation<object, { projectId: string; config: ArcgisWidgetConfig }>({
            query: ({ projectId, config }) => ({
                url: `/explorer/${projectId}/arcgis/config`,
                method: "PUT",
                body: config,
            }),
        }),
    }),
});

export const {
    useIsOmega365ConfiguredForProjectQuery,
    useGetOmega365DocumentLinksQuery,
    useGetArcgisWidgetConfigQuery,
    usePutArcgisWidgetConfigMutation,
    useGetPropertyTreeFavoritesQuery,
    useSetPropertyTreeFavoritesMutation,
    useLazyGetProjectQuery,
    useGetProjectQuery,
} = dataV2Api;
