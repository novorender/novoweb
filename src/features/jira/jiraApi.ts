import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Space } from "./types";

export const jiraIdentityServer = "https://auth.atlassian.com/authorize";
export const jiraClientId = window.jiraClientId || process.env.REACT_APP_JIRA_CLIENT_ID || "";
export const jiraClientSecret = window.jiraClientSecret || process.env.REACT_APP_JIRA_CLIENT_SECRET || "";
// export const baseUrl = process.env.NODE_ENV === "development" ? "/ditio" : "https://ditio-api-v3.azurewebsites.net";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "jira/api",
    prepareHeaders: (headers, { getState }) => {
        // const sessionId = (getState() as RootState).jira.sessionId;
        // headers.set("x-cookie", `login_remember_me=true; sessionid=${sessionId};`);
        return headers;
    },
});

export const jiraApi = createApi({
    reducerPath: "jiraApi",
    baseQuery: rawBaseQuery,
    endpoints: (builder) => ({
        getAccessibleResources: builder.mutation<Space[], { accessToken: string }>({
            queryFn: async ({ accessToken }) => {
                return fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                    .then((res) => res.json())
                    .then((data) => ({ data }))
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
                    .then((res) => res.json())
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
                    .then((res) => res.json())
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

export const { useGetTokenMutation, useGetAccessibleResourcesMutation, useRefreshTokensMutation } = jiraApi;
