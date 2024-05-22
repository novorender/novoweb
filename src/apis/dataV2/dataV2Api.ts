import { createApi } from "@reduxjs/toolkit/query/react";
import { minutesToSeconds } from "date-fns";

import { ArcgisWidgetConfig } from "features/arcgis";

import {
    DeviationAggregateDistribution,
    DeviationDistributionPoint,
    DeviationDistributionRequest,
    DeviationProjectConfig,
    PointCountAtDeviation,
} from "./deviationTypes";
import { Omega365Document } from "./omega365Types";
import { BuildProgressResult, EpsgSearchResult, ProjectInfo } from "./projectTypes";
import { getDataV2DynamicBaseQuery } from "./utils";

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: getDataV2DynamicBaseQuery(),
    tagTypes: ["PropertyTreeFavorites", "ProjectProgress", "Deviation"],
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
        calcDeviationDistributions: builder.mutation<
            DeviationDistributionPoint[],
            { projectId: string; profileId: string; config: DeviationDistributionRequest }
        >({
            query: ({ projectId, profileId: deviationId, config }) => ({
                url: `/explorer/${projectId}/deviations/${deviationId}/calcdistributions`,
                method: "POST",
                body: config,
            }),
        }),
        aggregateDeviationDistancesAlongCenterline: builder.query<
            DeviationAggregateDistribution[],
            { projectId: string; profileId: string; centerLineId: string; start: number; end: number }
        >({
            query: ({ projectId, profileId: deviationId, centerLineId, start, end }) => ({
                url: `/explorer/${projectId}/deviations/${deviationId}/centerline/${centerLineId}/stepaggregatedistances?start=${start}&end=${end}`,
            }),
        }),
        getTotalPointsAtDeviations: builder.query<
            PointCountAtDeviation[],
            { projectId: string; profileId: string; centerLineId: string; start: number; end: number }
        >({
            query: ({ projectId, profileId: deviationId, centerLineId, start, end }) => ({
                url: `/explorer/${projectId}/deviations/${deviationId}/centerline/${centerLineId}/totalpoints?start=${start}&end=${end}`,
            }),
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
    useIsOmega365ConfiguredForProjectQuery,
    useGetOmega365DocumentLinksQuery,
    useGetArcgisWidgetConfigQuery,
    usePutArcgisWidgetConfigMutation,
    useGetPropertyTreeFavoritesQuery,
    useSetPropertyTreeFavoritesMutation,
    useLazyGetProjectQuery,
    useGetProjectQuery,
    useLazyGetDeviationProfilesQuery,
    useSetDeviationProfilesMutation,
    useCalcDeviationsMutation,
    useCalcDeviationDistributionsMutation,
    useAggregateDeviationDistancesAlongCenterlineQuery,
    useGetTotalPointsAtDeviationsQuery,
    useGetProjectProgressQuery,
    useLazyGetFileDownloadLinkQuery,
    useSearchEpsgQuery,
} = dataV2Api;
