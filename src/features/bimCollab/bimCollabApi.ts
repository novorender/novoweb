import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { generateCodeChallenge } from "utils/auth";
import { generateRandomString } from "utils/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";

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
} from "./types";
import { handleImageResponse } from "./utils";

const clientId = "PlayGround_Client";
const clientSecret = process.env.REACT_APP_BIMCOLLAB_CLIENT_SECRET ?? "";
const callbackUrl = "http://localhost:5000/Callback";
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

    const adjustedUrl = `https://${space}.bimcollab.com/bcf/${version}/${urlEnd}`;
    const adjustedArgs = typeof args === "string" ? adjustedUrl : { ...args, url: adjustedUrl };
    return rawBaseQuery(adjustedArgs, api, extraOptions);
};

export const bimCollabApi = createApi({
    reducerPath: "bimCollabApi",
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        getVersions: builder.query<{ versions: Version[] }, void>({
            query: () => "versions",
        }),
        getAuthInfo: builder.query<AuthInfo, void>({
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
        }),
        getProjectExtensions: builder.query<ProjectExtensions, { projectId: string }>({
            query: ({ projectId }) => `projects/${projectId}/extensions`,
            keepUnusedDataFor: 3600,
        }),
        getTopics: builder.query<Topic[], { projectId: string }>({
            query: ({ projectId }) => `projects/${projectId}/topics`,
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
        }),
        getViewpoints: builder.query<Viewpoint[], { projectId: string; topicId: string }>({
            query: ({ projectId, topicId }) => `projects/${projectId}/topics/${topicId}/viewpoints`,
        }),
        getViewpoint: builder.query<Viewpoint, { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}`,
        }),
        getColoring: builder.query<Coloring[], { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/coloring`,
            transformResponse: (res: { coloring: Coloring[] }) => res.coloring,
        }),
        getSelection: builder.query<Component[], { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/selection`,
            transformResponse: (res: { selection: Component[] }) => res.selection,
        }),
        getVisibility: builder.query<Visibility, { projectId: string; topicId: string; viewpointId: string }>({
            query: ({ projectId, topicId, viewpointId }) =>
                `projects/${projectId}/topics/${topicId}/viewpoints/${viewpointId}/visibility`,
            transformResponse: (res: { visibility: Visibility }) => res.visibility,
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
        }),
        createTopic: builder.mutation<Topic, Partial<Topic> & Pick<Topic, "title"> & { projectId: string }>({
            query: ({ projectId, ...body }) => ({
                body,
                url: `projects/${projectId}/topics`,
                method: "POST",
            }),
        }),
        createViewpoint: builder.mutation<
            Viewpoint,
            Partial<Viewpoint> &
                Pick<Viewpoint, "perspective_camera" | "snapshot"> & {
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
    }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
    useGetVersionsQuery,
    useGetAuthInfoQuery,
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
    useCreateViewpointMutation,
    useCreateCommentMutation,
} = bimCollabApi;

export async function getCode(authUrl: string) {
    const verifier = generateRandomString();
    const challenge = await generateCodeChallenge(verifier);
    saveToStorage(StorageKey.BimCollabCodeVerifier, verifier);

    window.location.href =
        authUrl +
        `?response_type=code` +
        `&client_id=${clientId}` +
        `&scope=${scope}` +
        `&redirect_uri=${callbackUrl}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256`;
}

export async function getToken(
    oAuthTokenUrl: string,
    code: string
): Promise<{ access_token: string; refresh_token: string }> {
    const body = new URLSearchParams();
    body.set("code", code);
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", callbackUrl);
    body.set("code_verifier", getFromStorage(StorageKey.BimCollabCodeVerifier));

    return fetch(oAuthTokenUrl, {
        body,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then((r) => r.json());
}

export async function refreshTokens(
    oAuthTokenUrl: string,
    refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
    const body = new URLSearchParams();
    body.set("refresh_token", refreshToken);
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
    body.set("grant_type", "refresh_token");

    return fetch(oAuthTokenUrl, {
        body,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then((r) => r.json());
}

export async function authenticate(authInfo: AuthInfo): Promise<string> {
    const storedRefreshToken = getFromStorage(StorageKey.BimCollabRefreshToken);
    const code = new URLSearchParams(window.location.search).get("code");

    try {
        if (code) {
            window.history.replaceState(null, "", window.location.pathname.replace("Callback", ""));

            const res = await getToken(authInfo.oauth2_token_url, code);

            if (!res) {
                throw new Error("token request failed");
            }

            if (res.refresh_token) {
                saveToStorage(StorageKey.BimCollabRefreshToken, res.refresh_token);
            }

            return res.access_token;
        } else if (storedRefreshToken) {
            const res = await refreshTokens(authInfo.oauth2_token_url, storedRefreshToken);

            if (!res) {
                throw new Error("get code");
            }

            if (res.refresh_token) {
                saveToStorage(StorageKey.BimCollabRefreshToken, res.refresh_token);
            } else {
                deleteFromStorage(StorageKey.BimCollabRefreshToken);
            }

            return res.access_token;
        } else {
            throw new Error("get code");
        }
    } catch (e) {
        if (e instanceof Error && e.message === "get code") {
            getCode(authInfo.oauth2_auth_url);
        }

        return "";
    }
}
