import { useCallback } from "react";

import { useLazyGetObjectGroupIdsQuery } from "apis/dataV2/dataV2Api";
import { ObjectGroup } from "contexts/objectGroups";
import { useSceneId } from "hooks/useSceneId";

export function useFillGroupObjectIds() {
    const globalProjectId = useSceneId();
    const [getObjectGroupIds] = useLazyGetObjectGroupIdsQuery();

    return useCallback(
        // Can override projectId if it's called before sceneId is defined
        async (groups: ObjectGroup[], projectId = globalProjectId) => {
            await Promise.all(
                groups.map(async (group) => {
                    if (group.ids) {
                        return;
                    }

                    group.ids = new Set(
                        await getObjectGroupIds({ projectId, groupId: group.id }, true)
                            .unwrap()
                            .catch((error) => {
                                console.error(error);
                                return [];
                            })
                    );
                })
            );
        },
        [globalProjectId, getObjectGroupIds]
    );
}
