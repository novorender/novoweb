import { useGetProjectQuery } from "apis/dataV2/dataV2Api";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectProjectSettings } from "features/render";

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

    let result: string | undefined;
    if (projectInfoV2) {
        if (projectInfoV2.epsg) {
            result = projectInfoV2.epsg;
        }

        if (tmZone) {
            result = zoneNameToEpsg(tmZone);
        }
    }

    return { data: result, error, isFetching };
}

function zoneNameToEpsg(tmZone: string) {
    let m = tmZone.match(/WGS 84 \/ UTM zone (\d+)N/);
    if (m) {
        return "326" + m[1].padStart(2, "0");
    }

    m = tmZone.match(/WGS 84 \/ UTM zone (\d+)S/);
    if (m) {
        return "327" + m[1].padStart(2, "0");
    }

    m = tmZone.match(/ETRS89 \/ NTM zone (\d+)/);
    if (m) {
        return "51" + m[1].padStart(2, "0");
    }
}
