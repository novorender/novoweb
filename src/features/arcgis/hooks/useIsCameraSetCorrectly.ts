import { RenderStateCamera } from "@novorender/api";
import { useEffect, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";

export function useIsCameraSetCorrectly(check: (camera: RenderStateCamera | undefined) => boolean) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const [isCameraSetCorrectly, setIsCameraSetCorrectly] = useState(check(view?.renderState.camera));

    useEffect(() => {
        let mounted = true;

        function step() {
            if (!mounted) {
                return;
            }

            if (view) {
                setIsCameraSetCorrectly(check(view.renderState.camera));
            }

            requestAnimationFrame(step);
        }

        requestAnimationFrame(step);

        return () => {
            mounted = false;
        };
    });

    return isCameraSetCorrectly;
}
