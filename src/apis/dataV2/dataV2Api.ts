import { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createApi } from "@reduxjs/toolkit/query/react";
import { minutesToSeconds } from "date-fns";

import { type ArcgisWidgetConfig } from "features/arcgis/types";
import { CustomProperties } from "types/project";

import { AuthScope, PermissionInfo } from "./authTypes";
import { DeviationProjectConfig } from "./deviationTypes";
import { Omega365Document } from "./omega365Types";
import { Permission } from "./permissions";
import { BuildProgressResult, EpsgSearchResult, ProjectInfo, Role } from "./projectTypes";
import { getDataV2DynamicBaseQuery } from "./utils";

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: getDataV2DynamicBaseQuery(),
    tagTypes: ["PropertyTreeFavorites", "ProjectProgress", "Deviation", "Bookmarks", "Groups"],
    endpoints: (builder) => ({
        isOmega365ConfiguredForProject: builder.query<{ configured: boolean }, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/configured`,
        }),
        getOmega365DocumentLinks: builder.query<Omega365Document[], { projectId: string; objectId: number }>({
            query: ({ projectId, objectId }) => `/explorer/${projectId}/omega365/documents/${objectId}`,
        }),
        getPropertyTreeFavorites: builder.query<string[], { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/propertytree/favorites`,
            keepUnusedDataFor: minutesToSeconds(10),
            providesTags: ["PropertyTreeFavorites"],
            transformResponse: (data: { propertyName: string }[]) => data.map(({ propertyName }) => propertyName),
        }),
        setPropertyTreeFavorites: builder.mutation<void, { favorites: string[]; projectId: string }>({
            query: ({ projectId, favorites }) => ({
                url: `/explorer/${projectId}/propertytree/favorites`,
                method: "PUT",
                body: favorites.map((propertyName) => ({ propertyName })),
            }),
            invalidatesTags: ["PropertyTreeFavorites"],
            async onQueryStarted({ favorites, projectId }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    dataV2Api.util.updateQueryData("getPropertyTreeFavorites", { projectId }, () => favorites),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        getProject: builder.query<ProjectInfo, { projectId: string }>({
            query: ({ projectId }) => `/projects/${projectId}`,
        }),
        getArcgisWidgetConfig: builder.query<ArcgisWidgetConfig, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/arcgis/config`,
        }),
        putArcgisWidgetConfig: builder.mutation<object, { projectId: string; config: ArcgisWidgetConfig }>({
            query: ({ projectId, config }) => ({
                url: `/explorer/${projectId}/arcgis/config`,
                method: "PUT",
                body: config,
            }),
        }),
        getDeviationProfiles: builder.query<DeviationProjectConfig, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/deviations`,
            providesTags: (_result, _error, { projectId }) => [{ type: "Deviation", id: projectId }],
        }),
        setDeviationProfiles: builder.mutation<void, { projectId: string; config: DeviationProjectConfig }>({
            query: ({ projectId, config }) => ({
                url: `/explorer/${projectId}/deviations`,
                method: "PUT",
                body: config,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [{ type: "Deviation", id: projectId }],
        }),
        calcDeviations: builder.mutation<void, { projectId: string; config: DeviationProjectConfig }>({
            query: ({ projectId, config }) => ({
                url: `/projects/${projectId}/calcdeviations`,
                method: "PATCH",
                body: config,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [{ type: "ProjectProgress", id: projectId }],
        }),
        getProjectProgress: builder.query<BuildProgressResult, { projectId: string; position?: number }>({
            query: ({ projectId, position }) => ({
                url: `/projects/${projectId}/progress`,
                params: { position },
            }),
            providesTags: (_result, _error, { projectId }) => [{ type: "ProjectProgress", id: projectId }],
        }),
        getFileDownloadLink: builder.query<
            string,
            { relativeUrl: string } | { projectId: string; fileId: string; version: number }
        >({
            query: (params) => ({
                url:
                    "relativeUrl" in params
                        ? `/${params.relativeUrl}`
                        : `/projects/${params.projectId}/files/${params.fileId}/downloadlink/${params.version}`,
                responseHandler: async (resp) => {
                    const result = await resp.text();
                    return result;
                },
            }),
        }),
        searchEpsg: builder.query<EpsgSearchResult, { query: string }>({
            query: ({ query }) => ({
                url: `/epsg`,
                method: "POST",
                body: query,
            }),
        }),
        getFlatPermissions: builder.query<PermissionInfo[], void>({
            query: () => "/permissions/flat",
        }),
        getCurrentUserRoleAssignments: builder.query<
            Role[],
            { organizationId: string; projectId: string; viewerSceneId?: string }
        >({
            query: ({ organizationId, projectId, viewerSceneId }) => ({
                url: "/roles/assignments/current-user",
                method: "GET",
                params: { organizationId, projectId, viewerSceneId },
            }),
        }),
        checkPermissions: builder.query<Permission[], { scope: AuthScope; permissions: Permission[] }>({
            query: ({ scope, permissions }) => ({
                url: "/roles/check-permissions",
                method: "POST",
                body: {
                    scope,
                    permissionIds: permissions,
                },
            }),
            transformResponse: (resp: boolean[], _, { permissions }) => permissions.filter((p, i) => resp[i]),
        }),
        getBookmarks: builder.query<Bookmark[], { projectId: string; group?: string; personal?: boolean }>({
            query: ({ projectId, group, personal }) =>
                `/explorer/${projectId}/${personal ? "personal" : ""}bookmarks${group ? `/${group}` : ""}`,
            providesTags: ["Bookmarks"],
        }),
        saveBookmarks: builder.mutation<
            boolean,
            { projectId: string; bookmarks: Bookmark[]; group?: string; personal?: boolean }
        >({
            query: ({ projectId, bookmarks, group, personal }) => ({
                url: `/explorer/${projectId}/${personal ? "personal" : ""}bookmarks${group ? `/${group}` : ""}`,
                method: "POST",
                body: bookmarks,
            }),
            invalidatesTags: ["Bookmarks"],
        }),
        getGroupIds: builder.query<number[], { projectId: string; groupId: string }>({
            query: ({ projectId, groupId }) => `/explorer/${projectId}/groups/${groupId}/ids`,
            providesTags: ["Groups"],
        }),
        saveGroups: builder.mutation<void, { projectId: string; groups: ObjectGroup[] }>({
            query: ({ projectId, groups }) => ({
                url: `/explorer/${projectId}/scene-data`,
                method: "POST",
                body: { objectGroups: groups },
            }),
            invalidatesTags: ["Groups"],
        }),
        saveCustomProperties: builder.mutation<void, { projectId: string; data: CustomProperties }>({
            query: ({ projectId, data }) => ({
                url: `/explorer/${projectId}/scene-data`,
                method: "POST",
                body: { customProperties: data },
            }),
        }),
        getDitioToken: builder.query<{ access_token: string; expires_in: number }, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/ditio`,
        }),
        saveDitioConfig: builder.mutation<
            { access_token?: string },
            { projectId: string; data: { client_id: string; client_secret: string } }
        >({
            query: ({ projectId, data }) => ({
                url: `/explorer/${projectId}/ditio`,
                method: "POST",
                body: data,
            }),
        }),
    }),
});

export const {
    useIsOmega365ConfiguredForProjectQuery,
    useGetOmega365DocumentLinksQuery,
    useGetArcgisWidgetConfigQuery,
    usePutArcgisWidgetConfigMutation,
    useGetPropertyTreeFavoritesQuery,
    useSetPropertyTreeFavoritesMutation,
    useLazyGetProjectQuery,
    useGetProjectQuery,
    useLazyGetDeviationProfilesQuery,
    useSetDeviationProfilesMutation,
    useCalcDeviationsMutation,
    useGetProjectProgressQuery,
    useLazyGetFileDownloadLinkQuery,
    useSearchEpsgQuery,
    useLazyGetFlatPermissionsQuery,
    useLazyCheckPermissionsQuery,
    useGetCurrentUserRoleAssignmentsQuery,
    useGetBookmarksQuery,
    useLazyGetBookmarksQuery,
    useSaveBookmarksMutation,
    useLazyGetGroupIdsQuery,
    useSaveGroupsMutation,
    useSaveCustomPropertiesMutation,
    useLazyGetDitioTokenQuery,
    useSaveDitioConfigMutation,
} = dataV2Api;
