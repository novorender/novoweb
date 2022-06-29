import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { Account, Project, ProjectsResponse, SearchResponse, Unit, UnitsResponse } from "./types";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "leica/api",
    prepareHeaders: (headers, { getState }) => {
        const sessionId = (getState() as RootState).leica.sessionId;

        headers.set("x-cookie", `login_remember_me=true; sessionid=${sessionId};`);

        return headers;
    },
});

export const leicaApi = createApi({
    reducerPath: "leicaApi",
    baseQuery: rawBaseQuery,
    endpoints: (builder) => ({
        activeAccount: builder.query<Account, void>({
            query: () => `/accounts/v1/active/`,
            keepUnusedDataFor: 5 * 60,
        }),
        projects: builder.query<{ projects: Project[]; next?: number }, { accountId: string; page: number }>({
            query: ({ accountId, page }) =>
                `/accounts/v1/accounts/${accountId}/children/project/?page=${page}&page_size=25`,
            transformResponse: (res: ProjectsResponse, _meta, args) => ({
                projects: res.results,
                next: Boolean(res.next) ? args.page + 1 : undefined,
            }),
        }),
        search: builder.query<{ results: SearchResponse["results"]; next?: number }, { query: string; page: number }>({
            query: ({ query, page }) => `/accounts/v1/search/?p=${page}&q=${query}`,
            transformResponse: (res: SearchResponse, _meta, args) => ({
                results: res.results,
                next: Boolean(res.count / 10 > args.page) ? args.page + 1 : undefined,
            }),
        }),
        units: builder.query<{ units: Unit[]; next?: number }, { projectId: string; page: number }>({
            query: ({ projectId, page }) =>
                `/accounts/v1/accounts/${projectId}/units/?order_by=-metadata.is_online&page=${page}`,
            transformResponse: (res: UnitsResponse, _meta, args) => ({
                units: res.results,
                next: Boolean(res.next) ? args.page + 1 : undefined,
            }),
        }),
        allUnits: builder.query<Unit[], string>({
            queryFn: async (projectId, _queryApi, _extraOptions, fetchBaseQuery) => {
                let page: number | undefined = 1;
                let allUnits = [] as Unit[];

                while (page) {
                    const res = await fetchBaseQuery(
                        `/accounts/v1/accounts/${projectId}/units/?order_by=-metadata.is_online&page=${page}`
                    );

                    if (res.error) {
                        return allUnits.length ? { data: allUnits } : { error: res.error };
                    }

                    if (res.data) {
                        const data = res.data as UnitsResponse;
                        allUnits = [...allUnits, ...data.results];

                        page = Boolean(data.next) ? page + 1 : undefined;
                    }
                }

                return { data: allUnits };
            },
        }),
    }),
});

export const { useActiveAccountQuery, useProjectsQuery, useSearchQuery, useUnitsQuery, useAllUnitsQuery } = leicaApi;
