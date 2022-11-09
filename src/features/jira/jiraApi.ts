import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState } from "app/store";
import { AsyncStatus } from "types/misc";

import { selectJiraAccessToken, selectJiraSpace } from "./jiraSlice";
import { Component, CreateIssueMetadata, Issue, IssueType, Permission, Project, Space } from "./types";

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
        getPermissions: builder.query<string[], { project: string }>({
            query: ({ project }) =>
                `mypermissions?projectKey=${project}&permissions=CREATE_ISSUES,EDIT_ISSUES,ADD_COMMENTS`,
            transformResponse: (res: { permissions: { [key: string]: Permission } }) =>
                Object.values(res.permissions)
                    .filter((permission) => permission.havePermission)
                    .map((permission) => permission.key),
        }),
        getIssues: builder.query<Issue[], { project: string; component: string }>({
            query: ({ project, component }) => `search?jql=${`project = "${project}" AND component = "${component}"`}`,
            transformResponse: (res: { issues: Issue[] }) => res.issues,
        }),
        getIssue: builder.query<Issue, { key: string }>({
            query: ({ key }) => `issue/${key}`,
        }),
        createIssue: builder.mutation<any, { body: any }>({
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
        getIssueTypeScreenScheme: builder.query<Issue, { issueTypeId: string }>({
            query: ({ issueTypeId: _ }) => `issuetypescreenscheme`, // todo: kan sikkert slettes
        }),
        getCreateIssueMetadata: builder.query<CreateIssueMetadata["fields"], { issueTypeId: string }>({
            query: ({ issueTypeId }) =>
                `issue/createmeta?expand=projects.issuetypes.fields&issuetypeIds=${issueTypeId}`,
            transformResponse: (res: { projects: { issuetypes: CreateIssueMetadata[] }[] }) =>
                res.projects[0]?.issuetypes[0]?.fields,
        }),
        getIssueTypes: builder.query<IssueType[], { project: string }>({
            query: () => `issuetype`,
            transformResponse: (res: IssueType[], _meta, args) =>
                res.filter(
                    (issueType) =>
                        (!issueType.scope || issueType.scope.project.key === args.project) &&
                        issueType.hierarchyLevel === 0 // No sub-tasks or epic type tasks
                ),
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
    useLazyGetTokensQuery,
    useCreateIssueMutation,
    useGetAccessibleResourcesQuery,
    useRefreshTokensMutation,
    useGetProjectsQuery,
    useGetComponentsQuery,
    useGetIssuesQuery,
    useGetIssueQuery,
    useGetPermissionsQuery,
    useGetIssueTypesQuery,
    useGetIssueTypeScreenSchemeQuery,
    useGetCreateIssueMetadataQuery,
} = jiraApi;

const _allDefaultPermissions = {
    permissions: {
        ADD_COMMENTS: {
            key: "ADD_COMMENTS",
            name: "Add Comments",
            type: "PROJECT",
            description: "Ability to comment on issues.",
        },
        ADMINISTER: {
            key: "ADMINISTER",
            name: "Administer Jira",
            type: "GLOBAL",
            description:
                "Create and administer projects, issue types, fields, workflows, and schemes for all projects. Users with this permission can perform most administration tasks, except: managing users, importing data, and editing system email settings.",
        },
        ADMINISTER_PROJECTS: {
            key: "ADMINISTER_PROJECTS",
            name: "Administer Projects",
            type: "PROJECT",
            description: "Ability to administer a project in Jira.",
        },
        ASSIGNABLE_USER: {
            key: "ASSIGNABLE_USER",
            name: "Assignable User",
            type: "PROJECT",
            description: "Users with this permission may be assigned to issues.",
        },
        ASSIGN_ISSUES: {
            key: "ASSIGN_ISSUES",
            name: "Assign Issues",
            type: "PROJECT",
            description: "Ability to assign issues to other people.",
        },
        BROWSE_PROJECTS: {
            key: "BROWSE_PROJECTS",
            name: "Browse Projects",
            type: "PROJECT",
            description: "Ability to browse projects and the issues within them.",
        },
        BULK_CHANGE: {
            key: "BULK_CHANGE",
            name: "Make bulk changes",
            type: "GLOBAL",
            description: "Modify collections of issues at once. For example, resolve multiple issues in one step.",
        },
        CLOSE_ISSUES: {
            key: "CLOSE_ISSUES",
            name: "Close Issues",
            type: "PROJECT",
            description:
                "Ability to close issues. Often useful where your developers resolve issues, and a QA department closes them.",
        },
        CREATE_ATTACHMENTS: {
            key: "CREATE_ATTACHMENTS",
            name: "Create Attachments",
            type: "PROJECT",
            description: "Users with this permission may create attachments.",
        },
        CREATE_ISSUES: {
            key: "CREATE_ISSUES",
            name: "Create Issues",
            type: "PROJECT",
            description: "Ability to create issues.",
        },
        CREATE_PROJECT: {
            key: "CREATE_PROJECT",
            name: "Create team-managed projects",
            type: "GLOBAL",
            description:
                "Create projects separate from shared configurations and schemes. Team-managed projects don't affect existing projects or shared configurations like workflows, fields or permissions. Only licensed users can create team-managed projects.",
        },
        CREATE_SHARED_OBJECTS: {
            key: "CREATE_SHARED_OBJECTS",
            name: "Share dashboards and filters",
            type: "GLOBAL",
            description: "Share dashboards and filters with other users.",
        },
        DELETE_ALL_ATTACHMENTS: {
            key: "DELETE_ALL_ATTACHMENTS",
            name: "Delete All Attachments",
            type: "PROJECT",
            description: "Users with this permission may delete all attachments.",
        },
        DELETE_ALL_COMMENTS: {
            key: "DELETE_ALL_COMMENTS",
            name: "Delete All Comments",
            type: "PROJECT",
            description: "Ability to delete all comments made on issues.",
        },
        DELETE_ALL_WORKLOGS: {
            key: "DELETE_ALL_WORKLOGS",
            name: "Delete All Worklogs",
            type: "PROJECT",
            description: "Ability to delete all worklogs made on issues.",
        },
        DELETE_ISSUES: {
            key: "DELETE_ISSUES",
            name: "Delete Issues",
            type: "PROJECT",
            description: "Ability to delete issues.",
        },
        DELETE_OWN_ATTACHMENTS: {
            key: "DELETE_OWN_ATTACHMENTS",
            name: "Delete Own Attachments",
            type: "PROJECT",
            description: "Users with this permission may delete own attachments.",
        },
        DELETE_OWN_COMMENTS: {
            key: "DELETE_OWN_COMMENTS",
            name: "Delete Own Comments",
            type: "PROJECT",
            description: "Ability to delete own comments made on issues.",
        },
        DELETE_OWN_WORKLOGS: {
            key: "DELETE_OWN_WORKLOGS",
            name: "Delete Own Worklogs",
            type: "PROJECT",
            description: "Ability to delete own worklogs made on issues.",
        },
        EDIT_ALL_COMMENTS: {
            key: "EDIT_ALL_COMMENTS",
            name: "Edit All Comments",
            type: "PROJECT",
            description: "Ability to edit all comments made on issues.",
        },
        EDIT_ALL_WORKLOGS: {
            key: "EDIT_ALL_WORKLOGS",
            name: "Edit All Worklogs",
            type: "PROJECT",
            description: "Ability to edit all worklogs made on issues.",
        },
        EDIT_ISSUES: {
            key: "EDIT_ISSUES",
            name: "Edit Issues",
            type: "PROJECT",
            description: "Ability to edit issues.",
        },
        EDIT_OWN_COMMENTS: {
            key: "EDIT_OWN_COMMENTS",
            name: "Edit Own Comments",
            type: "PROJECT",
            description: "Ability to edit own comments made on issues.",
        },
        EDIT_OWN_WORKLOGS: {
            key: "EDIT_OWN_WORKLOGS",
            name: "Edit Own Worklogs",
            type: "PROJECT",
            description: "Ability to edit own worklogs made on issues.",
        },
        LINK_ISSUES: {
            key: "LINK_ISSUES",
            name: "Link Issues",
            type: "PROJECT",
            description:
                "Ability to link issues together and create linked issues. Only useful if issue linking is turned on.",
        },
        MANAGE_GROUP_FILTER_SUBSCRIPTIONS: {
            key: "MANAGE_GROUP_FILTER_SUBSCRIPTIONS",
            name: "Manage group filter subscriptions",
            type: "GLOBAL",
            description: "Create and delete group filter subscriptions.",
        },
        MANAGE_SPRINTS_PERMISSION: {
            key: "MANAGE_SPRINTS_PERMISSION",
            name: "Manage sprints",
            type: "PROJECT",
            description: "Ability to manage sprints.",
        },
        MANAGE_WATCHERS: {
            key: "MANAGE_WATCHERS",
            name: "Manage Watchers",
            type: "PROJECT",
            description: "Ability to manage the watchers of an issue.",
        },
        MODIFY_REPORTER: {
            key: "MODIFY_REPORTER",
            name: "Modify Reporter",
            type: "PROJECT",
            description: "Ability to modify the reporter when creating or editing an issue.",
        },
        MOVE_ISSUES: {
            key: "MOVE_ISSUES",
            name: "Move Issues",
            type: "PROJECT",
            description:
                "Ability to move issues between projects or between workflows of the same project (if applicable). Note the user can only move issues to a project they have the create permission for.",
        },
        RESOLVE_ISSUES: {
            key: "RESOLVE_ISSUES",
            name: "Resolve Issues",
            type: "PROJECT",
            description: "Ability to resolve and reopen issues. This includes the ability to set a fix version.",
        },
        SCHEDULE_ISSUES: {
            key: "SCHEDULE_ISSUES",
            name: "Schedule Issues",
            type: "PROJECT",
            description: "Ability to view or edit an issue's due date.",
        },
        SERVICEDESK_AGENT: {
            key: "SERVICEDESK_AGENT",
            name: "Service Project Agent",
            type: "PROJECT",
            description:
                "Allows users to interact with customers and access Jira Service Management features of a project.",
        },
        SET_ISSUE_SECURITY: {
            key: "SET_ISSUE_SECURITY",
            name: "Set Issue Security",
            type: "PROJECT",
            description:
                "Ability to set the level of security on an issue so that only people in that security level can see the issue.",
        },
        SYSTEM_ADMIN: {
            key: "SYSTEM_ADMIN",
            name: "Jira System Administrators",
            type: "GLOBAL",
            description:
                "Ability to perform all administration functions. There must be at least one group with this permission.",
        },
        TRANSITION_ISSUES: {
            key: "TRANSITION_ISSUES",
            name: "Transition Issues",
            type: "PROJECT",
            description: "Ability to transition issues.",
        },
        USER_PICKER: {
            key: "USER_PICKER",
            name: "Browse users and groups",
            type: "GLOBAL",
            description:
                "View and select users or groups from the user picker, and share issues. Users with this permission can see the names of all users and groups on your site.",
        },
        VIEW_AGGREGATED_DATA: {
            key: "VIEW_AGGREGATED_DATA",
            name: "View aggregated data",
            type: "PROJECT",
            description:
                "Users with this permission will have access to view combined and summarized project data, regardless of their individual permissions.",
        },
        VIEW_DEV_TOOLS: {
            key: "VIEW_DEV_TOOLS",
            name: "View Development Tools",
            type: "PROJECT",
            description:
                "Allows users in a software project to view development-related information on the issue, such as commits, reviews and build information.",
        },
        VIEW_READONLY_WORKFLOW: {
            key: "VIEW_READONLY_WORKFLOW",
            name: "View Read-Only Workflow",
            type: "PROJECT",
            description: "Users with this permission may view a read-only version of a workflow.",
        },
        VIEW_VOTERS_AND_WATCHERS: {
            key: "VIEW_VOTERS_AND_WATCHERS",
            name: "View Voters and Watchers",
            type: "PROJECT",
            description: "Ability to view the voters and watchers of an issue.",
        },
        WORK_ON_ISSUES: {
            key: "WORK_ON_ISSUES",
            name: "Work On Issues",
            type: "PROJECT",
            description: "Ability to log work done against an issue. Only useful if Time Tracking is turned on.",
        },
    },
};
