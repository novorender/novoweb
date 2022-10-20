import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState } from "app/store";
import { AsyncStatus } from "types/misc";

import { selectJiraAccessToken, selectJiraSpace } from "./jiraSlice";
import { Component, Issue, Project, Space } from "./types";

export const jiraIdentityServer = "https://auth.atlassian.com/authorize";
export const jiraClientId = window.jiraClientId || process.env.REACT_APP_JIRA_CLIENT_ID || "";
export const jiraClientSecret = window.jiraClientSecret || process.env.REACT_APP_JIRA_CLIENT_SECRET || "";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "/",
    prepareHeaders: (headers, { getState }) => {
        const token = selectJiraAccessToken(getState() as RootState);

        if (token.status === AsyncStatus.Success) {
            headers.set("Authorization", `Bearer ${token.data}`);
        }

        return headers;
    },
});

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const space = selectJiraSpace(api.getState() as RootState);

    if (!space) {
        return {
            error: {
                status: 400,
                statusText: "Bad Request",
                data: "No jira space provided",
            },
        };
    }

    const urlEnd = typeof args === "string" ? args : args.url;

    const adjustedUrl = `https://api.atlassian.com/ex/jira/${space.id}/rest/api/3/${urlEnd}`;
    const adjustedArgs = typeof args === "string" ? adjustedUrl : { ...args, url: adjustedUrl };
    return rawBaseQuery(adjustedArgs, api, extraOptions);
};

export const jiraApi = createApi({
    reducerPath: "jiraApi",
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        getIssues: builder.query<{ issues: Issue[] }, { project: string; component: string }>({
            query: ({ project, component }) =>
                `search?jql=${encodeURIComponent(`project = ${project} AND component = ${component}`)}`,
        }),
        getAccessibleResources: builder.mutation<Space[], { accessToken: string }>({
            queryFn: async ({ accessToken }) => {
                return fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
                    headers: { Authorization: `Bearer ${accessToken}` },
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
        getProjects: builder.query<Project[], { space: string; accessToken: string }>({
            queryFn: async ({ space, accessToken }) => {
                return fetch(`https://api.atlassian.com/ex/jira/${space}/rest/api/3/project`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
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
        getComponents: builder.query<Component[], { space: string; project: string; accessToken: string }>({
            queryFn: async ({ space, project, accessToken }) => {
                return fetch(`https://api.atlassian.com/ex/jira/${space}/rest/api/3/project/${project}/components`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
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
        getToken: builder.mutation<
            { access_token: string; refresh_token: string; expires_in: number },
            { code: string }
        >({
            queryFn: async ({ code }) => {
                return fetch("https://auth.atlassian.com/oauth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        grant_type: "authorization_code",
                        client_id: jiraClientId,
                        client_secret: jiraClientSecret,
                        code: code,
                        redirect_uri: window.location.origin,
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
            { access_token: string; refresh_token: string; expires_in: number },
            { refreshToken: string }
        >({
            queryFn: async ({ refreshToken }) => {
                return fetch("https://auth.atlassian.com/oauth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        grant_type: "refresh_token",
                        client_id: jiraClientId,
                        client_secret: jiraClientSecret,
                        refresh_token: refreshToken,
                        redirect_uri: window.location.origin,
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
    }),
});

export const {
    useGetTokenMutation,
    useGetAccessibleResourcesMutation,
    useRefreshTokensMutation,
    useGetProjectsQuery,
    useGetComponentsQuery,
    useGetIssuesQuery,
} = jiraApi;
