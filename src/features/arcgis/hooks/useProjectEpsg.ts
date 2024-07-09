import { useGetProjectQuery } from "apis/dataV2/dataV2Api";
import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectProjectSettings } from "features/render";
import { projectV1ZoneNameToEpsg } from "utils/misc";

// We either have TM Zone from the old API or EPSG code from the new API
// For old API - convert zone name to EPSG
// For new API just return EPSG
// New API takes precedence
export function useProjectEpsg({ skip }: { skip?: boolean } = {}) {
    const projectId = useExplorerGlobals(true).state.scene.id;
    const {
        data: projectInfoV2,
        error,
        isFetching,
    } = useGetProjectQuery(
        { projectId },
        {
            skip,
            selectFromResult: ({ data, error, isFetching }) => ({
                data: data && { epsg: data.epsg },
                error,
                isFetching,
            }),
        }
    );

    const tmZone = useAppSelector((state) => selectProjectSettings(state).tmZone);

    let result = projectInfoV2?.epsg;

    if (tmZone && !result) {
        result = projectV1ZoneNameToEpsg(tmZone);
    }

    return { data: result, error, isFetching };
}
