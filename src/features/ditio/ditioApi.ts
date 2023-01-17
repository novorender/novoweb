import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";

import { generateCodeChallenge } from "utils/auth";
import { generateRandomString } from "utils/misc";
import { getFromStorage, saveToStorage } from "utils/storage";
import { sleep } from "utils/timers";
import { FeedFilters } from "./ditioSlice";

import { AuthConfig, Post, Project, RawPost } from "./types";

export const identityServer = "https://identity.ditio.no/";
export const baseUrl = import.meta.env.NODE_ENV === "development" ? "/ditio" : "https://ditio-api-v3.azurewebsites.net";

const clientId = window.ditioClientId || import.meta.env.REACT_APP_DITIO_CLIENT_ID || "";
const clientSecret = window.ditioClientSecret || import.meta.env.REACT_APP_DITIO_CLIENT_SECRET || "";

const scope = "openid ditioapiv3 offline_access";
const callbackUrl = window.location.origin;

const rawBaseQuery = fetchBaseQuery({
    baseUrl: baseUrl + "/api",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).ditio.accessToken;

        if (token) {
            headers.set("authorization", `Bearer ${token}`);
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
        getProject: builder.mutation<Project, string | number>({
            query: (projectNumber) => `/v4/integration/projects/by-project-number/${projectNumber}`,
        }),
        getAuthConfig: builder.mutation<AuthConfig, void>({
            queryFn: () => {
                return fetch(`${identityServer}/.well-known/openid-configuration`)
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
        getToken: builder.mutation<
            { access_token: string; refresh_token: string },
            { tokenEndpoint: string; code: string }
        >({
            queryFn: ({ code, tokenEndpoint }) => {
                const body = new URLSearchParams();
                body.set("code", code);
                body.set("client_id", clientId);
                body.set("client_secret", clientSecret);
                body.set("grant_type", "authorization_code");
                body.set("redirect_uri", callbackUrl);
                body.set("code_verifier", getFromStorage(StorageKey.DitioCodeVerifier));

                return fetch(tokenEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body,
                })
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
        refreshToken: builder.mutation<
            { access_token: string; refresh_token: string },
            { tokenEndpoint: string; refreshToken: string }
        >({
            queryFn: ({ refreshToken, tokenEndpoint }) => {
                const body = new URLSearchParams();
                body.set("refresh_token", refreshToken);
                body.set("client_id", clientId);
                body.set("client_secret", clientSecret);
                body.set("grant_type", "refresh_token");

                return fetch(tokenEndpoint, {
                    body,
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                })
                    .then((r) => r.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
    }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
    useFeedWebRawQuery,
    useGetPostQuery,
    useRefreshTokenMutation,
    useGetTokenMutation,
    useGetAuthConfigMutation,
    useGetProjectMutation,
} = ditioApi;

export async function getCode(authUrl: string, state: string) {
    const verifier = generateRandomString();
    const challenge = await generateCodeChallenge(verifier);
    saveToStorage(StorageKey.DitioCodeVerifier, verifier);

    window.location.href =
        authUrl +
        `?response_type=code` +
        `&client_id=${clientId}` +
        `&scope=${scope}` +
        `&redirect_uri=${callbackUrl}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&state=${state}`;

    await sleep(10000);
}
