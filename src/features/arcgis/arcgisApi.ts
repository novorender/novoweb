import { request } from "@esri/arcgis-rest-request";
import { createApi } from "@reduxjs/toolkit/query/react";

import { LayerQueryParams, LayerQueryResp } from "./arcgisTypes";

function arcgisBaseQuery({ url, params }: { url: string; params?: object }, { signal }: { signal: AbortSignal }) {
    return request(url, {
        params,
        signal,
    })
        .then((data) => ({ data }))
        .catch((error) => ({ error }));
}

export const arcgisApi = createApi({
    reducerPath: "arcgisApi",
    baseQuery: arcgisBaseQuery,
    endpoints: (builder) => ({
        queryLayer: builder.query<
            LayerQueryResp,
            { featureServerUrl: string; layerId: number; params: LayerQueryParams }
        >({
            query: ({ featureServerUrl, layerId, params }) => {
                return { url: `${featureServerUrl}/${layerId}/query`, params };
            },
        }),
    }),
});

export const { useQueryLayerQuery } = arcgisApi;
