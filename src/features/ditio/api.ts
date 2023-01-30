import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { AsyncStatus } from "types/misc";

import { getFromStorage } from "utils/storage";
import { FeedFilters } from "./slice";

import { AuthConfig, Post, Project, RawPost } from "./types";

export const identityServer = "https://identity.ditio.no/";
export const baseUrl = import.meta.env.NODE_ENV === "development" ? "/ditio" : "https://ditio-api-v3.azurewebsites.net";

export const ditioClientId = window.ditioClientId || import.meta.env.REACT_APP_DITIO_CLIENT_ID || "";
const clientSecret = window.ditioClientSecret || import.meta.env.REACT_APP_DITIO_CLIENT_SECRET || "";
const callbackUrl = window.location.origin;

const rawBaseQuery = fetchBaseQuery({
    baseUrl: baseUrl + "/api",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).ditio.accessToken;

        if (token.status === AsyncStatus.Success) {
            headers.set("authorization", `Bearer ${token.data}`);
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
            { projId: string; filters: FeedFilters }
        >({
            query: ({ projId, filters }) =>
                `/v2/feedweb/raw-search/all-posts?limit=100&ExtendedResults=false&IncludeLikesAndComments=false&picturesOnly=true&sortby=newest&projId=${projId}&fromDateTimeStr=${
                    filters.date_from
                }&toDateTimeStr=${filters.date_to}&facetFilters={"PostOriginType":${
                    filters.alerts && filters.posts ? "null" : filters.alerts ? 1 : 0
                }}`,
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
        getAuthConfig: builder.query<AuthConfig, void>({
            queryFn: () => {
                return fetch(`${identityServer}/.well-known/openid-configuration`)
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
        getTokens: builder.query<
            { access_token: string; refresh_token: string; expires_in: number },
            { tokenEndpoint: string; code: string }
        >({
            queryFn: ({ code, tokenEndpoint }) => {
                const body = new URLSearchParams();
                body.set("code", code);
                body.set("client_id", ditioClientId);
                body.set("client_secret", clientSecret);
                body.set("grant_type", "authorization_code");
                body.set("redirect_uri", callbackUrl);
                body.set("code_verifier", getFromStorage(StorageKey.DitioCodeVerifier));

                return fetch(tokenEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body,
                })
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
        refreshTokens: builder.mutation<
            { access_token: string; refresh_token: string; expires_in: number },
            { tokenEndpoint: string; refreshToken: string }
        >({
            queryFn: ({ refreshToken, tokenEndpoint }) => {
                const body = new URLSearchParams();
                body.set("refresh_token", refreshToken);
                body.set("client_id", ditioClientId);
                body.set("client_secret", clientSecret);
                body.set("grant_type", "refresh_token");

                return fetch(tokenEndpoint, {
                    body,
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                })
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
    useRefreshTokensMutation,
    useLazyGetTokensQuery,
    useGetAuthConfigQuery,
    useGetProjectsQuery,
} = ditioApi;
