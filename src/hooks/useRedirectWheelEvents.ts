import { useCallback, WheelEvent as ReactWheelEvent } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";

export function useRedirectWheelEvents() {
    const {
        state: { canvas },
    } = useExplorerGlobals();

    const onWheel = useCallback(
        (evt: ReactWheelEvent) => {
            if (!canvas) {
                return;
            }
            const { view: _view, ...evtCopy } = evt;
            canvas.dispatchEvent(new WheelEvent("wheel", { ...evtCopy, view: window }));
        },
        [canvas]
    );

    return onWheel;
}
