import { useGetProjectQuery } from "apis/dataV2/dataV2Api";
import { type CadCamera } from "features/render/types";
import { useSceneId } from "hooks/useSceneId";

import { getDefaultCamera } from "../utils";

export function useDefaultCamera(): CadCamera | undefined {
    const sceneId = useSceneId();
    const { data: project } = useGetProjectQuery({ projectId: sceneId });

    const bb = project?.bounds;
    if (!bb) {
        return;
    }

    return getDefaultCamera(bb);
}
