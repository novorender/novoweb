import { useCallback, useMemo } from "react";

import { Permission } from "apis/dataV2/permissions";
import { useAppSelector } from "app/redux-store-interactions";
import { selectProjectV2Info } from "slices/explorer";
import { checkPermission } from "utils/auth";

// Why use check-permissions instead of list-permissions:
// list-permissions returns simplified list of permission where children are skipped if you have access to parent permission.
// To properly check permissions this way you need to know parent/child relationships and this might make frontend a bit more complicated.
// And this way we can keep this logic on the backend only.
// NOTE: parent/child relations are more complicated than just looking at permission key.
// E.g. "group" is a child of "scene".
export function useCheckProjectPermission() {
    const projectInfo = useAppSelector(selectProjectV2Info);

    const permissions = useMemo(
        () => (projectInfo?.permissions ? new Set(projectInfo.permissions) : null),
        [projectInfo?.permissions]
    );

    return useCallback(
        (permission: Permission) => {
            if (!permissions) {
                // If permissions are not defined - we're dealing with V1 project, so the caller can handle it separately
                // (e.g. fallback to checking for "administrator" role)
                return;
            }

            return checkPermission(permissions, permission);
        },
        [permissions]
    );
}
