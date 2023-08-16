import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState } from "app/store";
import { AsyncStatus } from "types/misc";
import { handleImageResponse } from "utils/bcf";

import { initialFilters, selectJiraAccessToken, selectJiraSpace } from "./jiraSlice";
import {
    Component,
    CreateIssueMetadata,
    CurrentUser,
    Field,
    Issue,
    IssueType,
    Permission,
    Project,
    Space,
} from "./types";

export const jiraIdentityServer = "https://auth.atlassian.com/authorize";
export const jiraClientId = window.jiraClientId || import.meta.env.REACT_APP_JIRA_CLIENT_ID || "";
export const jiraClientSecret = window.jiraClientSecret || import.meta.env.REACT_APP_JIRA_CLIENT_SECRET || "";

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
        getCurrentUser: builder.query<CurrentUser, void>({
            query: () => `myself`,
        }),
        getPermissions: builder.query<string[], { project: string }>({
            query: ({ project }) =>
                `mypermissions?projectKey=${project}&permissions=CREATE_ISSUES,EDIT_ISSUES,ADD_COMMENTS`,
            transformResponse: (res: { permissions: { [key: string]: Permission } }) =>
                Object.values(res.permissions)
                    .filter((permission) => permission.havePermission)
                    .map((permission) => permission.key),
        }),
        getIssues: builder.query<
            Issue[],
            { project: string; component: string; userId: string; filters: typeof initialFilters }
        >({
            query: ({ project, component, userId, filters }) =>
                `search?jql=${`project = "${project}" AND component = "${component}" ${
                    filters.unresolved ? `AND resolution = "Unresolved"` : ""
                } ${
                    userId && (filters.reportedByMe || filters.assignedToMe)
                        ? filters.reportedByMe && filters.assignedToMe
                            ? `AND (assignee = "${userId}" OR reporter = "${userId}")`
                            : filters.assignedToMe
                            ? `AND assignee = "${userId}"`
                            : `AND reporter = "${userId}"`
                        : ""
                }&maxResults=150`}`,
            transformResponse: (res: { issues: Issue[] }) => res.issues,
        }),
        getIssue: builder.query<Issue, { key: string }>({
            query: ({ key }) => `issue/${key}`,
        }),
        createIssue: builder.mutation<{ id: string; key: string; self: string }, { body: any }>({
            query: ({ body }) => ({
                url: "issue",
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body,
            }),
        }),
        addAttachment: builder.mutation<{ id: string; key: string; self: string }, { issueId: string; form: FormData }>(
            {
                query: ({ issueId, form }) => ({
                    url: `issue/${issueId}/attachments`,
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "X-Atlassian-Token": "no-check",
                    },
                    body: form,
                }),
            }
        ),
        getAttachmentThumbnail: builder.query<string, { id: string }>({
            query: ({ id }) => ({
                url: `attachment/thumbnail/${id}`,
                headers: {
                    Accept: "application/json",
                },
                responseHandler: handleImageResponse,
            }),
        }),
        getAttachmentContent: builder.query<string, { id: string }>({
            query: ({ id }) => ({
                url: `attachment/content/${id}`,
                headers: {
                    Accept: "application/json",
                },
                responseHandler: handleImageResponse,
            }),
        }),
        getNovorenderMetaCustomField: builder.query<string, void>({
            query: () => ({
                url: `field`,
            }),
            transformResponse: (res: Field[]) => {
                return res.find((field) => field.name === "NOVORENDER_META")?.key ?? "";
            },
        }),
        createComment: builder.mutation<any, { body: any; issueKey: string }>({
            query: ({ body, issueKey }) => ({
                url: `issue/${issueKey}/comment`,
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body,
            }),
        }),
        getCreateIssueMetadata: builder.query<
            CreateIssueMetadata["fields"],
            { issueTypeId: string; projectKey: string }
        >({
            query: ({ issueTypeId, projectKey }) =>
                `issue/createmeta?expand=projects.issuetypes.fields&issuetypeIds=${issueTypeId}&projectKeys=${projectKey}`,
            transformResponse: (res: { projects: { issuetypes: CreateIssueMetadata[] }[] }) =>
                res.projects[0]?.issuetypes[0]?.fields,
        }),
        getIssueTypes: builder.query<IssueType[], { projectId: string }>({
            // NOTE(OLA) Marked as experimental.
            // Use commented lines (and pass in project key instead of id) if thist stops working.
            query: ({ projectId }) => `/issuetype/project?projectId=${projectId}&level=0`,
            // transformResponse: (res: IssueType[], _meta, args) =>
            //     res.filter(
            //         (issueType) =>
            //             (!issueType.scope || issueType.scope.project.key === args.project) &&
            //             issueType.hierarchyLevel === 0 // No sub-tasks or epic type tasks
            //     ),
        }),
        getAccessibleResources: builder.query<Space[], { accessToken: string }>({
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
        getTokens: builder.query<{ access_token: string; refresh_token: string; expires_in: number }, { code: string }>(
            {
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
            }
        ),
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
    useGetCurrentUserQuery,
    useLazyGetTokensQuery,
    useCreateIssueMutation,
    useCreateCommentMutation,
    useAddAttachmentMutation,
    useGetAttachmentThumbnailQuery,
    useGetAttachmentContentQuery,
    useGetNovorenderMetaCustomFieldQuery,
    useGetAccessibleResourcesQuery,
    useRefreshTokensMutation,
    useGetProjectsQuery,
    useGetComponentsQuery,
    useGetIssuesQuery,
    useGetIssueQuery,
    useGetPermissionsQuery,
    useGetIssueTypesQuery,
    useGetCreateIssueMetadataQuery,
} = jiraApi;
