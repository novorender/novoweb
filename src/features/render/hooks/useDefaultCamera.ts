import { useAppSelector } from "app/redux-store-interactions";
import { type CadCamera } from "features/render/types";
import { selectProjectV2Info } from "slices/explorer";

import { getDefaultCamera } from "../utils";

export function useDefaultCamera(): CadCamera | undefined {
    const project = useAppSelector(selectProjectV2Info);

    const bb = project?.bounds;
    if (!bb) {
        return;
    }

    return getDefaultCamera(bb);
}
