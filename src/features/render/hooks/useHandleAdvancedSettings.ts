import { useEffect } from "react";

import { useAppSelector } from "app/store";

import { selectAdvanced, selectDeviceProfile, selectPoints } from "..";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function useHandleAdvancedSettings() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const settings = useAppSelector(selectAdvanced);
    const pointSize = useAppSelector(selectPoints).size;
    const deviceProfile = useAppSelector(selectDeviceProfile);

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

    useEffect(() => {
        if (!view) {
            return;
        }

        // todo
        console.log(deviceProfile);
    }, [view, deviceProfile]);
}
