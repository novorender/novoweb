import { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createApi } from "@reduxjs/toolkit/query/react";
import { minutesToSeconds } from "date-fns";

import { type ArcgisWidgetConfig } from "features/arcgis/types";
import { CustomProperties } from "types/project";

import { AuthScope, ScopeRoleAssignment } from "./authTypes";
import { DeviationProjectConfig } from "./deviationTypes";
import { Omega365Configuration, Omega365DynamicDocument, Omega365View } from "./omega365Types";
import { Permission } from "./permissions";
import { BuildProgressResult, EpsgSearchResult, ProjectInfo, ProjectVersion } from "./projectTypes";
import { getDataV2DynamicBaseQuery } from "./utils";

export const dataV2Api = createApi({
    reducerPath: "dataV2",
    baseQuery: getDataV2DynamicBaseQuery(),
    tagTypes: ["PropertyTreeFavorites", "ProjectProgress", "Deviation", "Bookmarks", "Groups", "OmegaItems"],
    endpoints: (builder) => ({
        getOmega365ProjectConfig: builder.query<Omega365Configuration, { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/configuration`,
        }),
        setOmega365ProjectConfig: builder.mutation<void, { projectId: string; config: Omega365Configuration }>({
            query: ({ projectId, config }) => ({
                url: `/explorer/${projectId}/omega365/configuration`,
                method: "PUT",
                body: config,
            }),
        }),
        previewOmega365ProjectViewConfig: builder.query<
            Omega365DynamicDocument[],
            { projectId: string; objectId: number; baseURL: string; view: Omega365View }
        >({
            query: ({ projectId, objectId, baseURL, view }) => ({
                url: `/explorer/${projectId}/omega365/configuration/preview-view`,
                method: "POST",
                body: { objectId, baseURL, view },
            }),
        }),
        getOmega365ViewDocumentLinks: builder.query<
            Omega365DynamicDocument[],
            { projectId: string; objectId: number; viewId: string }
        >({
            query: ({ projectId, objectId, viewId }) =>
                `/explorer/${projectId}/omega365/views/${viewId}/documents/${objectId}`,
            providesTags: ["OmegaItems"],
        }),
        getOmegaActivityTypes: builder.query<{ id: number; name: string }[], { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/activity-types`,
            keepUnusedDataFor: 60 * 60,
            transformResponse: idAndNameUniqueById,
        }),
        getOmegaOrgUnits: builder.query<{ id: number; name: string }[], { projectId: string }>({
            query: ({ projectId }) => `/explorer/${projectId}/omega365/org-units`,
            keepUnusedDataFor: 60 * 60,
            transformResponse: idAndNameUniqueById,
        }),
        createOmegaActivity: builder.mutation<
            { newActivityUrl: string },
            {
                projectId: string;
                activity: { name: string; objectId: number; activityTypeId: number; orgUnitId: number };
            }
        >({
            query: ({ projectId, activity }) => ({
                url: `/explorer/${projectId}/omega365/activity`,
                method: "POST",
                body: activity,
            }),
            invalidatesTags: ["OmegaItems"],
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
        getProjectVersions: builder.query<ProjectVersion[], { projectId: string }>({
            query: ({ projectId }) => `/projects/${projectId}/versions`,
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
        getCurrentUserRoleAssignments: builder.query<
            ScopeRoleAssignment[],
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

function idAndNameUniqueById(items: { id: number; name: string }[]) {
    const result: typeof items = [];
    for (const item of items) {
        if (!result.some((e) => e.id === item.id)) {
            result.push(item);
        }
    }
    return result;
}

export const {
    useGetOmega365ProjectConfigQuery,
    useSetOmega365ProjectConfigMutation,
    useLazyPreviewOmega365ProjectViewConfigQuery,
    useGetOmega365ViewDocumentLinksQuery,
    useGetOmegaActivityTypesQuery,
    useGetOmegaOrgUnitsQuery,
    useCreateOmegaActivityMutation,
    useGetArcgisWidgetConfigQuery,
    usePutArcgisWidgetConfigMutation,
    useGetPropertyTreeFavoritesQuery,
    useSetPropertyTreeFavoritesMutation,
    useLazyGetProjectQuery,
    useGetProjectQuery,
    useLazyGetProjectVersionsQuery,
    useLazyGetDeviationProfilesQuery,
    useSetDeviationProfilesMutation,
    useCalcDeviationsMutation,
    useGetProjectProgressQuery,
    useLazyGetFileDownloadLinkQuery,
    useSearchEpsgQuery,
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
