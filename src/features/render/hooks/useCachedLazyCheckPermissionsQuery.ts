import { useCallback } from "react";

import { AuthScope } from "apis/dataV2/authTypes";
import { useLazyCheckPermissionsQuery } from "apis/dataV2/dataV2Api";
import { Permission } from "apis/dataV2/permissions";
import { useAppSelector } from "app/redux-store-interactions";
import { selectIsOnline } from "slices/explorer";
import { getManualCache } from "utils/manualCache";

export function useCachedCheckPermissionsQuery() {
    const [checkPermissions] = useLazyCheckPermissionsQuery();
    const isOnline = useAppSelector(selectIsOnline);

    return useCallback(
        async (args: { scope: AuthScope; permissions: Permission[] }) => {
            const cacheKey = `/derived/project-permissions/${JSON.stringify(args.scope)}`;
            const cache = await getManualCache();

            if (isOnline) {
                // Network first
                const resp = await checkPermissions(args).unwrap();
                cache.put(cacheKey, Response.json(resp));
                return resp;
            } else {
                const resp = await cache.match(cacheKey);
                if (resp) {
                    return await resp.json();
                } else {
                    throw new Error("No cached value for check-permissions");
                }
            }
        },
        [checkPermissions, isOnline],
    );
}
