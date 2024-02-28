import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

const characterMap = [
    ['"', "%22"],
    ["<", "%3c"],
    [">", "%3e"],
    ["|", "%7c"],
    [":", "%3a"],
    ["*", "%2a"],
    ["?", "%3f"],
    ["\\", "%5c"],
    ["/", "%2f"],
    ["=", "%3d"],
    ["+", "%2b"],
    [" ", "+"],
    ["%", "%25"],
];

function encodePropertyPath(_path: string): string {
    let path = _path;

    for (const [invalid, encoded] of characterMap) {
        path = path.replaceAll(invalid, encoded);
    }

    return path.toLowerCase();
}

const dynamicBaseQuery: BaseQueryFn<FetchArgs & { assetUrl: string }, unknown, FetchBaseQueryError> = async (
    { assetUrl, ...args },
    api,
    extraOptions
) => {
    const url = new URL(assetUrl);
    url.pathname += args.url;

    return fetchBaseQuery()(
        {
            ...args,
            url: url.toString(),
        },
        api,
        extraOptions
    );
};

export const propertyTreeApi = createApi({
    reducerPath: "propertyTreeApi",
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        getProperties: builder.query<
            { properties: string[] } | { values: string[] },
            { path: string; assetUrl: string }
        >({
            query: ({ path, assetUrl }) => ({ assetUrl, url: `propcache/${encodePropertyPath(path)}` }),
            transformResponse: (data: { properties: string[] } | { values: string[] }) =>
                "values" in data ? { values: data.values.slice(0, 100) } : data,
        }),
    }),
});

export const { useGetPropertiesQuery } = propertyTreeApi;
