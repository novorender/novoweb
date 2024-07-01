import { createApi } from "@reduxjs/toolkit/query/react";
import { minutesToSeconds } from "date-fns";

import { ArcgisWidgetConfig } from "features/arcgis";

import { DeviationProjectConfig } from "./deviationTypes";
import { Omega365Configuration, Omega365DynamicDocument, Omega365View } from "./omega365Types";
import { BuildProgressResult, EpsgSearchResult, ProjectInfo } from "./projectTypes";
import { getDataV2DynamicBaseQuery } from "./utils";

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: getDataV2DynamicBaseQuery(),
    tagTypes: ["PropertyTreeFavorites", "ProjectProgress", "Deviation"],
    endpoints: (builder) => ({
        getOmega365ProjectConfig: builder.query<Omega365Configuration, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/configuration`,
        }),
        setOmega365ProjectConfig: builder.mutation<void, { projectId: string; config: Omega365Configuration }>({
            query: ({ projectId, config }) => ({
                url: `/explorer/${projectId}/omega365/configuration`,
                method: "PUT",
                body: config,
            }),
        }),
        previewOmega365ProjectViewConfig: builder.query<
            Omega365DynamicDocument[],
            { projectId: string; objectId: number; baseURL: string; view: Omega365View }
        >({
            query: ({ projectId, objectId, baseURL, view }) => ({
                url: `/explorer/${projectId}/omega365/configuration/preview-view`,
                method: "POST",
                body: { objectId, baseURL, view },
            }),
        }),
        getOmega365ViewDocumentLinks: builder.query<
            Omega365DynamicDocument[],
            { projectId: string; objectId: number; viewId: string }
        >({
            query: ({ projectId, objectId, viewId }) =>
                `/explorer/${projectId}/omega365/views/${viewId}/documents/${objectId}`,
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
        getDeviationProfiles: builder.query<DeviationProjectConfig, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/deviations`,
            providesTags: (_result, _error, { projectId }) => [{ type: "Deviation", id: projectId }],
        }),
        setDeviationProfiles: builder.mutation<void, { projectId: string; config: DeviationProjectConfig }>({
            query: ({ projectId, config }) => ({
                url: `/explorer/${projectId}/deviations`,
                method: "PUT",
                body: config,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [{ type: "Deviation", id: projectId }],
        }),
        calcDeviations: builder.mutation<void, { projectId: string; config: DeviationProjectConfig }>({
            query: ({ projectId, config }) => ({
                url: `/projects/${projectId}/calcdeviations`,
                method: "PATCH",
                body: config,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [{ type: "ProjectProgress", id: projectId }],
        }),
        getProjectProgress: builder.query<BuildProgressResult, { projectId: string; position?: number }>({
            query: ({ projectId, position }) => ({
                url: `/projects/${projectId}/progress`,
                params: { position },
            }),
            providesTags: (_result, _error, { projectId }) => [{ type: "ProjectProgress", id: projectId }],
        }),
        getFileDownloadLink: builder.query<
            string,
            { relativeUrl: string } | { projectId: string; fileId: string; version: number }
        >({
            query: (params) => ({
                url:
                    "relativeUrl" in params
                        ? `/${params.relativeUrl}`
                        : `/projects/${params.projectId}/files/${params.fileId}/downloadlink/${params.version}`,
                responseHandler: async (resp) => {
                    const result = await resp.text();
                    return result;
                },
            }),
        }),
        searchEpsg: builder.query<EpsgSearchResult, { query: string }>({
            query: ({ query }) => ({
                url: `/epsg`,
                method: "POST",
                body: query,
            }),
        }),
    }),
});

export const {
    useGetOmega365ProjectConfigQuery,
    useSetOmega365ProjectConfigMutation,
    useLazyPreviewOmega365ProjectViewConfigQuery,
    useGetOmega365ViewDocumentLinksQuery,
    useGetArcgisWidgetConfigQuery,
    usePutArcgisWidgetConfigMutation,
    useGetPropertyTreeFavoritesQuery,
    useSetPropertyTreeFavoritesMutation,
    useLazyGetProjectQuery,
    useGetProjectQuery,
    useLazyGetDeviationProfilesQuery,
    useSetDeviationProfilesMutation,
    useCalcDeviationsMutation,
    useGetProjectProgressQuery,
    useLazyGetFileDownloadLinkQuery,
    useSearchEpsgQuery,
} = dataV2Api;
