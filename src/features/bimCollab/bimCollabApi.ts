import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import {
    AuthInfo,
    Coloring,
    Comment,
    Component,
    Project,
    ProjectExtensions,
    Topic,
    User,
    Version,
    Viewpoint,
    Visibility,
} from "types/bcf";
import { generateCodeChallenge } from "utils/auth";
import { handleImageResponse } from "utils/bcf";
import { getFromStorage, saveToStorage } from "utils/storage";
import { sleep } from "utils/time";

import { NewViewpoint } from "./includeViewpoint";

const callbackUrl = window.location.origin + "/";
const scope = "openid offline_access bcf";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "/",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).bimCollab.accessToken;

        if (token) {
            headers.set("authorization", `Bearer ${token}`);
        }

        return headers;
    },
});

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const { space, version } = (api.getState() as RootState).bimCollab;
    if (!space) {
        return {
            error: {
                status: 400,
                statusText: "Bad Request",
                data: "No bimcollab space provided",
            },
        };
    }

    const urlEnd = typeof args === "string" ? args : args.url;

    if (urlEnd !== "versions" && !version) {
        return {
            error: {
                status: 400,
                statusText: "Bad Request",
                data: "No api version provided",
            },
        };
    }

    const adjustedUrl = `https://${space}.bimcollab.com/bcf/${version ? version + "/" : ""}${urlEnd}`;
    const adjustedArgs = typeof args === "string" ? adjustedUrl : { ...args, url: adjustedUrl };
    return rawBaseQuery(adjustedArgs, api, extraOptions);
};

export const bimCollabApi = createApi({
    reducerPath: "bimCollabApi",
    tagTypes: ["Topics"],
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        getVersions: builder.mutation<{ versions: Version[] }, void>({
            query: () => "versions",
        }),
        getAuthInfo: builder.mutation<AuthInfo, void>({
            query: () => "auth",
        }),
        getCurrentUser: builder.query<User, void>({
            query: () => "current-user",
        }),
        getProjects: builder.query<Project[], void>({
            query: () => "projects",
        }),
        getProject: builder.query<Project, { projectId: string }>({
            query: ({ projectId }) => `projects/${projectId}`,
            keepUnusedDataFor: 60 * 5,
        }),
        getProjectExtensions: builder.query<ProjectExtensions, { projectId: string }>({
            query: ({ projectId }) => `projects/${projectId}/extensions`,
            keepUnusedDataFor: 60 * 5,
        }),
        getTopics: builder.query<Topic[], { projectId: string }>({
            query: ({ projectId }) => `projects/${projectId}/topics`,
            providesTags: ["Topics"],
        }),
        getTopic: builder.query<Topic, { projectId: string; topicId: string }>({
            query: ({ projectId, topicId }) => `projects/${projectId}/topics/${topicId}`,
        }),
        getComments: builder.query<Comment[], { projectId: string; topicId: string }>({
            query: ({ projectId, topicId }) => `projects/${projectId}/topics/${topicId}/comments`,
        }),
        getComment: builder.query<Comment, { projectId: string; topicId: string; commentId: string }>({
            query: ({ projectId, topicId, commentId }) =>
                `projects/${projectId}/topics/${topicId}/comments/${commentId}`,
            keepUnusedDataFor: 60 * 5,
        }),
        getViewpoints: builder.query<Viewpoint[], { projectId: string; topicId: string }>({
            query: ({ projectId, topicId }) => `projects/${projectId}/topics/${topicId}/viewpoints`,
        }),
        getViewpoint: builder.query<Viewpoint, { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}`,
            keepUnusedDataFor: 60 * 5,
        }),
        getColoring: builder.query<Coloring[], { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/coloring`,
            transformResponse: (res: { coloring: Coloring[] }) => res.coloring,
            keepUnusedDataFor: 60 * 5,
        }),
        getSelection: builder.query<Component[], { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/selection`,
            transformResponse: (res: { selection: Component[] }) => res.selection,
            keepUnusedDataFor: 60 * 5,
        }),
        getVisibility: builder.query<Visibility, { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/visibility`,
            transformResponse: (res: { visibility: Visibility }) => res.visibility,
            keepUnusedDataFor: 60 * 5,
        }),
        getSnapshot: builder.query<string, { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) => ({
                url: `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/snapshot`,
                responseHandler: handleImageResponse,
            }),
        }),
        getThumbnail: builder.query<string, { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) => ({
                url: `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/thumbnail`,
                responseHandler: handleImageResponse,
            }),
            keepUnusedDataFor: 60 * 5,
        }),
        createTopic: builder.mutation<Topic, Partial<Topic> & Pick<Topic, "title"> & { projectId: string }>({
            query: ({ projectId, ...body }) => ({
                body,
                url: `projects/${projectId}/topics`,
                method: "POST",
            }),
            invalidatesTags: ["Topics"],
        }),
        updateTopic: builder.mutation<Topic, Partial<Topic> & { projectId: string; topicId: string }>({
            query: ({ projectId, topicId, ...body }) => ({
                body,
                url: `projects/${projectId}/topics/${topicId}`,
                method: "PUT",
            }),
            invalidatesTags: ["Topics"],
        }),
        createViewpoint: builder.mutation<
            Viewpoint,
            NewViewpoint & {
                projectId: string;
                topicId: string;
            }
        >({
            query: ({ projectId, topicId, ...body }) => ({
                body,
                url: `projects/${projectId}/topics/${topicId}/viewpoints`,
                method: "POST",
            }),
        }),
        createComment: builder.mutation<
            Comment,
            Partial<Comment> & Pick<Comment, "comment"> & { projectId: string; topicId: string }
        >({
            query: ({ projectId, topicId, ...body }) => ({
                body,
                url: `projects/${projectId}/topics/${topicId}/comments`,
                method: "POST",
            }),
        }),
        getToken: builder.mutation<
            { access_token: string; refresh_token: string },
            { tokenUrl: string; code: string; config: { bimCollabClientId: string; bimCollabClientSecret: string } }
        >({
            queryFn: ({ code, tokenUrl, config }) => {
                const body = new URLSearchParams();
                body.set("code", code);
                body.set("client_id", config.bimCollabClientId);
                body.set("client_secret", config.bimCollabClientSecret);
                body.set("grant_type", "authorization_code");
                body.set("redirect_uri", callbackUrl);
                body.set("code_verifier", getFromStorage(StorageKey.BimCollabCodeVerifier));

                return fetch(tokenUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body,
                })
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
        refreshToken: builder.mutation<
            { access_token: string; refresh_token: string },
            {
                tokenUrl: string;
                refreshToken: string;
                config: { bimCollabClientId: string; bimCollabClientSecret: string };
            }
        >({
            queryFn: ({ refreshToken, tokenUrl, config }) => {
                const body = new URLSearchParams();
                body.set("refresh_token", refreshToken);
                body.set("client_id", config.bimCollabClientId);
                body.set("client_secret", config.bimCollabClientSecret);
                body.set("grant_type", "refresh_token");

                return fetch(tokenUrl, {
                    body,
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                })
                    .then((r) => r.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
    }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
    useGetVersionsMutation,
    useGetAuthInfoMutation,
    useGetCurrentUserQuery,
    useGetProjectsQuery,
    useGetProjectQuery,
    useGetProjectExtensionsQuery,
    useGetTopicsQuery,
    useGetTopicQuery,
    useGetCommentsQuery,
    useGetViewpointsQuery,
    useGetViewpointQuery,
    useGetColoringQuery,
    useGetSelectionQuery,
    useGetVisibilityQuery,
    useGetSnapshotQuery,
    useGetThumbnailQuery,
    useCreateTopicMutation,
    useUpdateTopicMutation,
    useCreateViewpointMutation,
    useCreateCommentMutation,
    useGetTokenMutation,
    useRefreshTokenMutation,
} = bimCollabApi;

export async function getCode(authUrl: string, state: string, config: { bimCollabClientId: string }) {
    const [verifier, challenge] = await generateCodeChallenge();
    saveToStorage(StorageKey.BimCollabCodeVerifier, verifier);

    window.location.href =
        authUrl +
        `?response_type=code` +
        `&client_id=${config.bimCollabClientId}` +
        `&scope=${scope}` +
        `&redirect_uri=${callbackUrl}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&state=${state}`;

    await sleep(10000);
}
