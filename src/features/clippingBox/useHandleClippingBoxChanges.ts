import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectPicker, Picker, renderActions, selectClippingBox } from "features/render/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function useHandleClippingBoxChanges() {
    const {
        state: { view_OLD: view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const selecting = useAppSelector(selectPicker) === Picker.ClippingBox;
    const clippingBox = useAppSelector(selectClippingBox);

    useEffect(() => {
        if (!view) {
            return;
        }

        view.applySettings({ clippingPlanes: { ...clippingBox } });
    }, [view, clippingBox]);

    useEffect(() => {
        if (!view) {
            return;
        }

        if (selecting) {
            dispatch(
                renderActions.setClippingBox({
                    enabled: true,
                    showBox: true,
                    defining:
                        view.settings.clippingPlanes.bounds.min.every((v) => v === 0) &&
                        view.settings.clippingPlanes.bounds.max.every((v) => v === 0),
                    highlight: -1,
                })
            );
        } else {
            dispatch(
                renderActions.setClippingBox({
                    showBox: false,
                    defining: false,
                    highlight: -1,
                })
            );
        }
    }, [selecting, dispatch, view]);
}
