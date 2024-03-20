import { useEffect } from "react";

import { useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectAdvanced, selectPoints } from "../renderSlice";

export function useHandleAdvancedSettings() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const settings = useAppSelector(selectAdvanced);
    const pointSize = useAppSelector(selectPoints).size;

    useEffect(() => {
        if (!view) {
            return;
        }

        view.modifyRenderState({
            output: {
                samplesMSAA: settings.msaa.enabled ? settings.msaa.samples : 0,
            },
            toonOutline: settings.toonOutline,
            tonemapping: settings.tonemapping,
            pick: settings.pick,
            debug: settings.debug,
            outlines: { breakingPointAngleThreshold: settings.outlines.breakingPointAngleThreshold },
        });
    }, [view, settings]);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.modifyRenderState({
            points: {
                size: pointSize,
            },
        });
    }, [view, pointSize]);
}
