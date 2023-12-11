import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { dataServerBaseUrl } from "config/app";
import { AsyncStatus } from "types/misc";

import { FeedFilters } from "./slice";
import { Dumper, Loader, Post, Project, RawPost } from "./types";

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
        feedWebRaw: builder.query<
            {
                geoLocation: { lat: number; lon: number } | null;
                fileIds: string[];
                text: string;
                taskDescription: string;
                id: string;
                author: string;
                isAlert: boolean;
            }[],
            { projects: string[]; filters: FeedFilters }
        >({
            query: ({ projects, filters }) =>
                `/v2/feedweb/raw-search/all-posts?limit=100&ExtendedResults=false&IncludeLikesAndComments=false&picturesOnly=true&sortby=newest&projId=${projects.join(
                    ","
                )}&fromDateTimeStr=${filters.date_from}&toDateTimeStr=${
                    filters.date_to
                }&facetFilters={"PostOriginType":${filters.alerts && filters.posts ? "null" : filters.alerts ? 1 : 0}}`,
            transformResponse: ({ Result }: { Count: number | null; More: boolean; Result: RawPost[] }) =>
                Result.map((res) => ({
                    id: res.Id,
                    author: res.UserName,
                    geoLocation: res.GeoLocation
                        ? {
                              lat: res.GeoLocation.Latitude,
                              lon: res.GeoLocation.Longitude,
                          }
                        : null,
                    fileIds: res.FileReferenceIds ?? [],
                    text: res.Text ?? "",
                    taskDescription: res.TaskDescription,
                    isAlert: res.PostOriginType === 1,
                })),
        }),
        getPost: builder.query<Post, { postId: string }>({
            query: ({ postId }) => `/v2/feedweb/${postId}`,
        }),
        getProjects: builder.query<Project[], void>({
            query: () => `/v4/integration/projects`,
        }),
        getLiveMachines: builder.query<
            {
                dumperLiveDataList: Omit<Dumper, "kind" | "scenePosition" | "id">[];
                loaderLiveDataList: Omit<Loader, "kind" | "scenePosition" | "id">[];
            },
            undefined
        >({
            queryFn: async (_args, api) => {
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
                const token = (api.getState() as any).auth.accessToken;

                return fetch(
                    `${dataServerBaseUrl}/scenes/${sceneId}/ditio`,
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
    useFeedWebRawQuery,
    useGetPostQuery,
    useGetProjectsQuery,
    useLazyGetTokenQuery,
    useGetLiveMachinesQuery,
} = ditioApi;
