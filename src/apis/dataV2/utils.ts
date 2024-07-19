import { BaseQueryFn, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { type RootState } from "app/store";
import { selectConfig } from "slices/explorer";

import { AuthScope } from "./authTypes";

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

export function getDataV2DynamicBaseQuery(suffix = "") {
    const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
        args,
        api,
        extraOptions
    ) => {
        const baseUrl = selectConfig(api.getState() as RootState).dataV2ServerUrl + suffix;
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

    return dynamicBaseQuery;
}

export function authScopeToString(scope: AuthScope) {
    return (
        "/" +
        [
            scope.organizationId ? `org/${scope.organizationId}` : null,
            scope.projectId ? `project/${scope.projectId}` : null,
            scope.resourceId && scope.resourceType ? `${scope.resourceType}/${scope.resourceId}` : null,
        ]
            .filter((e) => e)
            .join("/")
    );
}
