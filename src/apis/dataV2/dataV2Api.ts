import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { selectConfig } from "slices/explorerSlice";

import { Omega365Document } from "./omega365Types";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "",
    prepareHeaders: (headers, { getState }) => {
        const {
            auth: { accessToken },
        } = getState() as RootState;

        if (accessToken) {
            headers.set("authorization", `Bearer ${accessToken}`);
        }

        return headers;
    },
});

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const baseUrl = selectConfig(api.getState() as RootState).dataV2ServerUrl;
    if (!baseUrl) {
        return {
            error: {
                status: 400,
                statusText: "Bad Request",
                data: "data-v2 URL is not defined",
            },
        };
    }
    const urlEnd = typeof args === "string" ? args : args.url;
    const adjustedUrl = `${baseUrl}${urlEnd}`;
    const adjustedArgs = typeof args === "string" ? adjustedUrl : { ...args, url: adjustedUrl };

    return rawBaseQuery(adjustedArgs, api, extraOptions);
};

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        isOmega365ConfiguredForProject: builder.query<{ configured: boolean }, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/configured`,
        }),
        getOmega365DocumentLinks: builder.query<Omega365Document[], { projectId: string; objectId: number }>({
            query: ({ projectId, objectId }) => `/explorer/${projectId}/omega365/documents/${objectId}`,
        }),
    }),
});

export const { useIsOmega365ConfiguredForProjectQuery, useGetOmega365DocumentLinksQuery } = dataV2Api;
