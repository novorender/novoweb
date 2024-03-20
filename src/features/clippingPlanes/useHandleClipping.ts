import { useEffect } from "react";

import { useAppSelector } from "app";
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
            clipping: {
                ...clipping,
                planes: clipping.planes.map(({ baseW: _baseW, ...plane }) => ({
                    ...plane,
                    outline: { enabled: clipping.outlines ? plane.outline.enabled : false },
                })),
            },
        });
    }, [view, clipping]);
}
