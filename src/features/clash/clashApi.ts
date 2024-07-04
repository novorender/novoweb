import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { vec3 } from "gl-matrix";

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
            transformResponse: (data: ClashListFile) => {
                return {
                    ...data,
                    clashes: data.clashes.map((clash) => ({
                        ...clash,
                        clashPoint: vec3.fromValues(clash.clashPoint[0], clash.clashPoint[1], -clash.clashPoint[2]),
                    })),
                };
            },
        }),
    }),
});

export const { useGetProfileListQuery, useGetClashListQuery } = clashApi;
