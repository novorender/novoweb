import { useAppSelector } from "app/redux-store-interactions";
import { selectProjectSettings } from "features/render";
import { selectProjectV2Info } from "slices/explorer";
import { projectV1ZoneNameToEpsg } from "utils/misc";

// We either have TM Zone from the old API or EPSG code from the new API
// For old API - convert zone name to EPSG
// For new API just return EPSG
// New API takes precedence
export function useProjectEpsg() {
    const projectInfoV2 = useAppSelector(selectProjectV2Info);

    const tmZone = useAppSelector((state) => selectProjectSettings(state).tmZone);

    let result: string | undefined = projectInfoV2.epsg;

    if (tmZone && !result) {
        result = projectV1ZoneNameToEpsg(tmZone);
    }

    return result;
}
