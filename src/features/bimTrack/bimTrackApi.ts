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
    Viewpoint,
    Visibility,
} from "types/bcf";
import { AsyncStatus } from "types/misc";
import { generateCodeChallenge } from "utils/auth";
import { handleImageResponse } from "utils/bcf";
import { generateRandomString } from "utils/misc";
import { getFromStorage, saveToStorage } from "utils/storage";
import { sleep } from "utils/time";

import { NewViewpoint } from "./includeViewpoint";

const callbackUrl = window.location.origin + "/";
const scope = "openid offline_access BcfWebApi";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "/",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).bimTrack.accessToken;

        if (token.status === AsyncStatus.Success) {
            headers.set("authorization", `Bearer ${token.data}`);
        }

        return headers;
    },
});

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const urlEnd = typeof args === "string" ? args : args.url;
    const server = (api.getState() as RootState).bimTrack.config.server;
    const adjustedUrl = `/bimtrack/bcf/2.1/${urlEnd}${urlEnd.includes("?") ? "&" : "?"}server=${server}`;
    const adjustedArgs = typeof args === "string" ? adjustedUrl : { ...args, url: adjustedUrl };

    return rawBaseQuery(adjustedArgs, api, extraOptions);
};

export const bimTrackApi = createApi({
    reducerPath: "bimTrackApi",
    tagTypes: ["Topics", "Projects"],
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        getAuthInfo: builder.mutation<AuthInfo, void>({
            query: () => "auth",
        }),
        getCurrentUser: builder.query<User, void>({
            query: () => "current-user",
        }),
        getProjects: builder.query<Project[], { server: string; token: string }>({
            queryFn: ({ server, token }) =>
                fetch(`/bimtrack/bcf/2.1/projects?server=${server}`, { headers: { authorization: `Bearer ${token}` } })
                    .then((res) => {
                        if (res.ok) {
                            return res.json();
                        } else {
                            throw res.status;
                        }
                    })
                    .then((data) => ({ data }))
                    .catch((error) => ({ error })),
            providesTags: ["Projects"],
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
        getToken: builder.query<
            { access_token: string; refresh_token: string },
            { code: string; config: { bimTrackClientId: string; bimTrackClientSecret: string } }
        >({
            queryFn: ({ code, config }) => {
                const body = new URLSearchParams();
                body.set("code", code);
                body.set("client_id", config.bimTrackClientId);
                body.set("client_secret", config.bimTrackClientSecret);
                body.set("grant_type", "authorization_code");
                body.set("redirect_uri", callbackUrl);
                body.set("code_verifier", getFromStorage(StorageKey.BimTrackCodeVerifier));

                return fetch("/bimtrack/token", {
                    // return fetch("https://auth.bimtrackapp.co/connect/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body,
                })
                    .then((res) => res.json())
                    .then((data) => ({ data }))
                    .catch((error) => ({ error }));
            },
        }),
        refreshToken: builder.query<
            { access_token: string; refresh_token: string },
            { refreshToken: string; config: { bimTrackClientId: string; bimTrackClientSecret: string } }
        >({
            queryFn: ({ refreshToken, config }) => {
                const body = new URLSearchParams();
                body.set("refresh_token", refreshToken);
                body.set("client_id", config.bimTrackClientId);
                body.set("client_secret", config.bimTrackClientSecret);
                body.set("grant_type", "refresh_token");

                return fetch("/bimtrack/token", {
                    // return fetch("https://auth.bimtrackapp.co/connect/token", {
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
    useCreateTopicMutation,
    useUpdateTopicMutation,
    useCreateViewpointMutation,
    useCreateCommentMutation,
    useLazyGetTokenQuery,
    useLazyRefreshTokenQuery,
    util: { resetApiState: resetBimTrackApiState, invalidateTags: invalidateBimTrackTags },
} = bimTrackApi;

export async function getCode(state: string, config: { bimTrackClientId: string; bimTrackClientSecret: string }) {
    const verifier = generateRandomString();
    const challenge = await generateCodeChallenge(verifier);
    saveToStorage(StorageKey.BimTrackCodeVerifier, verifier);

    window.location.href =
        "https://auth.bimtrackapp.co/connect/authorize" +
        `?response_type=code` +
        `&client_id=${config.bimTrackClientId}` +
        `&scope=${scope}` +
        `&redirect_uri=${callbackUrl}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&state=${state}`;

    await sleep(10000);
}
