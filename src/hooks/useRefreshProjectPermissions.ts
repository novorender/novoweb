import { useEffect } from "react";

import { useLazyCheckPermissionsQuery } from "apis/dataV2/dataV2Api";
import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectSceneOrganization } from "features/render";
import { explorerActions, selectProjectV2Info } from "slices/explorer";

export function useRefreshProjectPermissions() {
    const projectId = useAppSelector(selectProjectV2Info)?.id;
    const org = useAppSelector(selectSceneOrganization);
    const dispatch = useAppDispatch();

    const [checkPermissions] = useLazyCheckPermissionsQuery();

    useEffect(() => {
        if (!projectId) {
            return;
        }

        // TODO debounce?
        async function refresh() {
            if (!document.hidden) {
                const permissions = await checkPermissions({
                    scope: { organizationId: org, projectId },
                    permissionIds: Object.values(Permission),
                }).unwrap();
                dispatch(explorerActions.setProjectPermissions(permissions));
                // console.log("permissions", permissions);
            }
        }

        function onVisible() {
            if (!document.hidden) {
                refresh();
            }
        }

        const timer = setInterval(refresh, 60000 * 5);

        document.addEventListener("visibilitychange", onVisible);

        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [dispatch, checkPermissions, org, projectId]);
}
