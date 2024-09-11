import { useEffect } from "react";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectSceneOrganization } from "features/render";
import { useCachedCheckPermissionsQuery } from "features/render/hooks/useCachedLazyCheckPermissionsQuery";
import { explorerActions, selectProjectV2Info } from "slices/explorer";

import { useSceneId } from "./useSceneId";

export function useRefreshProjectPermissions() {
    const projectId = useAppSelector(selectProjectV2Info)?.id;
    const sceneId = useSceneId();
    const org = useAppSelector(selectSceneOrganization);
    const dispatch = useAppDispatch();

    const checkPermissions = useCachedCheckPermissionsQuery();

    useEffect(() => {
        if (!projectId) {
            return;
        }

        async function refresh() {
            if (!document.hidden) {
                const viewerSceneId = projectId === sceneId ? undefined : sceneId;
                try {
                    const permissions = await checkPermissions({
                        scope: { organizationId: org, projectId, viewerSceneId },
                        permissions: Object.values(Permission),
                    });
                    dispatch(explorerActions.setProjectPermissions(permissions));
                } catch (ex) {
                    console.warn("Error refreshing permissions", ex);
                }
            }
        }

        function onVisible() {
            if (!document.hidden) {
                refresh();
            }
        }

        document.addEventListener("visibilitychange", onVisible);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [dispatch, checkPermissions, org, projectId, sceneId]);
}
