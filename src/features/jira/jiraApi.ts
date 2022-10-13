import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Space } from "./types";

export const identityServer = "https://auth.atlassian.com/authorize";
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
        getToken: builder.mutation<{ access_token: string; refresh_token: string }, { code: string }>({
            queryFn: async ({ code }) => {
                return fetch("https://auth.atlassian.com/oauth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        grant_type: "authorization_code",
                        client_id: window.jiraClientId || process.env.REACT_APP_JIRA_CLIENT_ID || "",
                        client_secret: window.jiraClientSecret || process.env.REACT_APP_JIRA_CLIENT_SECRET || "",
                        code: code,
                        redirect_uri: window.location.origin,
                    }),
                })
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
    }),
});

export const { useGetTokenMutation, useGetAccessibleResourcesMutation } = jiraApi;
