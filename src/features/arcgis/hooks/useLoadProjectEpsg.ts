import { useGetProjectInfoQuery } from "apis/dataV2/dataV2Api";

import { useExplorerGlobals } from "contexts/explorerGlobals";

export function useLoadProjectEpsg() {
    const projectId = useExplorerGlobals(true).state.scene.id;
    const { data: projectInfo } = useGetProjectInfoQuery({ projectId });
    const epsg = projectInfo?.epsg;

    return epsg;
}
