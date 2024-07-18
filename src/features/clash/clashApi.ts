import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { ClashListFile, ClashResultFile } from "./types";

export const clashApi = createApi({
    reducerPath: "clashApi",
    baseQuery: fetchBaseQuery(),
    endpoints: (builder) => ({
        getProfileList: builder.query<ClashResultFile, { assetUrl: string }>({
            query: ({ assetUrl }) => assetUrl,
        }),
        getClashList: builder.query<ClashListFile, { assetUrl: string }>({
            query: ({ assetUrl }) => assetUrl,
        }),
    }),
});

export const { useGetProfileListQuery, useGetClashListQuery } = clashApi;
