import { useCallback, useMemo } from "react";

import { Permission } from "apis/dataV2/permissions";
import { useAppSelector } from "app/redux-store-interactions";
import { selectProjectV2Info } from "slices/explorer";
import { checkPermission } from "utils/auth";

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
