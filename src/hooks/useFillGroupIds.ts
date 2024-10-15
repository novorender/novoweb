import { useCallback } from "react";

import { useLazyGetGroupIdsQuery } from "apis/dataV2/dataV2Api";
import { ObjectGroup } from "contexts/objectGroups";

import { useSceneId } from "./useSceneId";

export function useFillGroupIds() {
    const sceneId = useSceneId();
    const [getGroupIds] = useLazyGetGroupIdsQuery();

    return useCallback(
        async (groups: ObjectGroup[], projectId = sceneId) => {
            await Promise.all(
                groups
                    .filter((g) => !g.ids)
                    .map(async (group) => {
                        group.ids = new Set(
                            await getGroupIds({ projectId, groupId: group.id })
                                .unwrap()
                                .catch(() => {
                                    console.warn("failed to load ids for group - ", group.id);
                                    return [] as number[];
                                })
                        );
                    })
            );
        },
        [sceneId, getGroupIds]
    );
}
