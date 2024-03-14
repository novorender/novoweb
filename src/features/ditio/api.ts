import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { dataApi } from "app";
import { RootState } from "app/store";
import { AsyncStatus } from "types/misc";

import { FeedFilters, FilterType } from "./slice";
import {
    Checklist,
    ChecklistItemMeta,
    ChecklistStatus,
    Dumper,
    FeedItem,
    FeedItemMeta,
    FeedItemPreview,
    GetDataResponse,
    Loader,
    PostOriginType,
    Project,
    SearchResultType,
} from "./types";

export const identityServer = "https://identity.ditio.no/";
export const baseUrl = "/ditio";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: baseUrl + "/api",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).ditio.accessToken;

        if (token.status === AsyncStatus.Success) {
            headers.set("authorization", `Bearer ${token.data.token}`);
        }

        return headers;
    },
});

export const ditioApi = createApi({
    reducerPath: "ditioApi",
    baseQuery: rawBaseQuery,
    endpoints: (builder) => ({
        getPost: builder.query<FeedItem, { postId: string }>({
            query: ({ postId }) => `/v2/feedweb/${postId}`,
        }),
        getProjects: builder.query<Project[], void>({
            query: () => `/v4/integration/projects`,
        }),
        getChecklistItems: builder.query<ChecklistItemMeta[], { projects: string[]; filters: FeedFilters }>({
            query: ({ projects, filters }) => ({
                url: `/v4/search/get-data`,
                method: "POST",
                body: {
                    projectIds: projects,
                    limit: 150,
                    sortBy: "newest",
                    includeSearchResultTypes: [SearchResultType.Checklist],
                    checklistSearchParameters: {
                        status: ChecklistStatus.Reported,
                    },
                    ...(filters.date_from ? { fromDateTime: filters.date_from } : {}),
                    ...(filters.date_to ? { toDateTime: filters.date_to } : {}),
                },
            }),
            transformResponse: async (res: GetDataResponse) => {
                return res.Checklists;
            },
        }),
        getChecklists: builder.query<Checklist[], { ids: string[] }>({
            query: ({ ids }) => ({
                url: "/v4/checklists/checklists/export/json/by-ids",
                method: "POST",
                body: ids,
            }),
        }),
        getFeedItems: builder.query<FeedItemMeta[], { projects: string[]; filters: FeedFilters }>({
            query: ({ projects, filters }) => ({
                url: `/v4/search/get-data`,
                method: "POST",
                body: {
                    projectIds: projects,
                    limit: 150,
                    sortBy: "newest",
                    includeSearchResultTypes: [SearchResultType.FeedPost, SearchResultType.Alert],
                    feedSearchParameters: {
                        hasImage: true,
                    },
                    ...(filters.date_from ? { fromDateTime: filters.date_from } : {}),
                    ...(filters.date_to ? { toDateTime: filters.date_to } : {}),
                },
            }),
            transformResponse: async (res: GetDataResponse, _meta, { filters }) => {
                if (filters[FilterType.Alerts] && filters[FilterType.Posts]) {
                    return res.FeedItems;
                }

                return res.FeedItems.filter((item) =>
                    filters[FilterType.Alerts]
                        ? item.PostOriginType === PostOriginType.Alert || item.PostOriginType === PostOriginType.AlertV2
                        : item.PostOriginType === PostOriginType.Post
                );
            },
        }),
        getFeed: builder.query<FeedItemPreview[], { ids: string[] }>({
            query: ({ ids }) => ({
                url: "/v2/feedweb/get-by-ids",
                method: "POST",
                body: ids,
            }),
            transformResponse: (res: FeedItem[]) =>
                res.map((feedItem) => ({
                    id: feedItem.Id,
                    author: feedItem.UserName,
                    geoLocation: feedItem.GeoCoordinate
                        ? {
                              lat: feedItem.GeoCoordinate.Latitude,
                              lon: feedItem.GeoCoordinate.Longitude,
                          }
                        : null,
                    fileIds: feedItem.FileReferences?.filter((ref) => ref.IsImage).map((ref) => ref.Id) ?? [],
                    text: feedItem.Text ?? "",
                    taskDescription: feedItem.TaskDescription,
                    isAlert:
                        feedItem.PostOriginType === PostOriginType.Alert ||
                        feedItem.PostOriginType === PostOriginType.AlertV2,
                })),
        }),
        getLiveMachines: builder.query<
            {
                dumperLiveDataList: Omit<Dumper, "kind" | "scenePosition" | "id">[];
                loaderLiveDataList: Omit<Loader, "kind" | "scenePosition" | "id">[];
            },
            undefined
        >({
            queryFn: async (_args, api) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const token = (api.getState() as any).ditio.accessToken;

                if (token.status !== AsyncStatus.Success) {
                    return { error: { status: "401", data: "Not authorized." } };
                }

                return fetch(`/ditio-machines/live/company`, {
                    headers: { authorization: `Bearer ${token.data.token}` },
                })
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
        getToken: builder.query<{ access_token: string; expires_in: number }, { sceneId: string }>({
            queryFn: async ({ sceneId }, api) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const token = (api.getState() as any).auth.accessToken;

                return fetch(
                    `${dataApi.serviceUrl}/scenes/${sceneId}/ditio`,
                    token ? { headers: { authorization: `Bearer ${token}` } } : undefined
                )
                    .then((res) => {
                        if (res.ok) {
                            return res.json();
                        } else {
                            throw res.status;
                        }
                    })
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
    }),
});

export const {
    useGetPostQuery,
    useGetFeedItemsQuery,
    useGetFeedQuery,
    useGetChecklistItemsQuery,
    useGetChecklistsQuery,
    useGetProjectsQuery,
    useLazyGetTokenQuery,
    useGetLiveMachinesQuery,
} = ditioApi;
