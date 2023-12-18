import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { AsyncStatus } from "types/misc";

import { selectXsiteManageAccessToken } from "./slice";
import { LogPoint, Machine, Site } from "./types";

export const xsiteManageAuthServer = "https://auth.prod.xsitemanage.com";
const maxPageSize = 100;

const baseQuery = retry(
    fetchBaseQuery({
        baseUrl: "/xsitemanage",
        prepareHeaders: (headers, { getState }) => {
            const token = selectXsiteManageAccessToken(getState() as RootState);

            if (token.status === AsyncStatus.Success) {
                headers.set("Authorization", `Bearer ${token.data}`);
            }

            return headers;
        },
    })
);

export const xsiteManageApi = createApi({
    baseQuery,
    reducerPath: "xsiteManageApi",
    endpoints: (builder) => ({
        getSites: builder.query<{ items: Site[]; nextToken?: string }, void>({
            query: () => `/ext/0/site/sites?maxPageSize=${maxPageSize}`,
        }),
        getMachines: builder.query<Machine[], string>({
            query: (siteId) => `/ext/0/site/sites/machines?siteId=${siteId}`,
            transformResponse: (res: { items: Machine[] }) =>
                res.items
                    .filter((machine) => machine.inactiveTimestamp === undefined)
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        }),
        getLogPoints: builder.query<
            { items: LogPoint[]; nextToken?: string },
            { siteId: string; since?: string; nextToken?: string }
        >({
            query: ({ siteId, since, nextToken }) =>
                `/ext/1/point/points?siteId=${siteId}&since=${since ?? 0}${
                    nextToken ? `&nextToken=${nextToken}` : ""
                }&maxPageSize=${maxPageSize}`,
            transformResponse: (res: { items: LogPoint[]; nextToken?: string }) => ({
                ...res,
                items: res.items.map((pt) => {
                    if (pt.x && pt.y && pt.z) {
                        return {
                            ...pt,
                            x: pt.y,
                            y: pt.x,
                            z: pt.z,
                        };
                    }

                    return pt;
                }),
            }),
        }),
        getAllLogPoints: builder.query<LogPoint[], string>({
            queryFn: async (siteId, _queryApi, _extraOptions, fetchBaseQuery) => {
                const allLogPoints = [] as LogPoint[];
                let nextToken: string | undefined = undefined;

                do {
                    const res = await fetchBaseQuery(
                        `/ext/1/point/points?siteId=${siteId}&since=0${
                            nextToken ? `&nextToken=${nextToken}` : ""
                        }&maxPageSize=${maxPageSize}`
                    );

                    if (res.error) {
                        console.warn(res.error);
                        return allLogPoints.length ? { data: allLogPoints } : { error: res.error };
                    }

                    if (res.data) {
                        const data = res.data as { items: LogPoint[]; nextToken?: string };
                        allLogPoints.push(...data.items);
                        nextToken = data.nextToken;
                    }
                } while (nextToken);

                return {
                    data: allLogPoints.map((pt) => {
                        if (pt.x && pt.y && pt.z) {
                            return {
                                ...pt,
                                x: pt.y,
                                y: pt.x,
                                z: pt.z,
                            };
                        }

                        return pt;
                    }),
                };
            },
        }),
        getTokens: builder.query<
            { access_token: string; id_token: string; refresh_token: string; expires_in: number },
            { code: string; config: { xsiteManageClientId: string } }
        >({
            queryFn: async ({ code, config }) => {
                return fetch(xsiteManageAuthServer + "/oauth2/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code: code,
                        redirect_uri: window.location.origin,
                        client_id: config.xsiteManageClientId,
                    }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw res.statusText;
                        }
                        return res.json();
                    })
                    .then((data) => {
                        if (data.error) {
                            return { error: data.error };
                        }
                        return { data };
                    })
                    .catch((error) => ({ error }));
            },
        }),
        refreshTokens: builder.mutation<
            { access_token: string; id_token: string; expires_in: number },
            { refreshToken: string; config: { xsiteManageClientId: string } }
        >({
            queryFn: async ({ refreshToken, config }) => {
                return fetch(xsiteManageAuthServer + "/oauth2/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "refresh_token",
                        client_id: config.xsiteManageClientId,
                        refresh_token: refreshToken,
                        redirect_uri: window.location.origin,
                    }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw res;
                        }
                        return res.json();
                    })
                    .then((data) => {
                        if (data.error) {
                            return { error: data.error };
                        }

                        return { data };
                    })
                    .catch((error) => ({ error }));
            },
        }),
    }),
});

export const {
    useLazyGetTokensQuery,
    useRefreshTokensMutation,
    useGetSitesQuery,
    useGetMachinesQuery,
    useGetLogPointsQuery,
    useGetAllLogPointsQuery,
} = xsiteManageApi;
