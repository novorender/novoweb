import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { dataV2ServerBaseUrl } from "config/app";

import { Omega365Document } from "./omega365Types";

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: fetchBaseQuery({
        baseUrl: dataV2ServerBaseUrl,
        prepareHeaders: (headers, { getState }) => {
            const {
                auth: { accessToken },
            } = getState() as RootState;

            if (accessToken) {
                headers.set("authorization", `Bearer ${accessToken}`);
            }

            return headers;
        },
    }),
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
