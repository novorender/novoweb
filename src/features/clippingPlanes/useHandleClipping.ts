import { useEffect } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectClippingPlanes } from "features/render";

export function useHandleClipping() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const clipping = useAppSelector(selectClippingPlanes);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.modifyRenderState({
            clipping: { ...clipping, planes: clipping.planes.map(({ baseW: _baseW, ...plane }) => plane) },
            outlines: { plane: clipping.planes[0] ? [...clipping.planes[0].normalOffset] : [0, -1, 0, 0] },
        });
    }, [view, clipping]);
}
