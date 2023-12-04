import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectDeviations } from "features/render";

import { selectDeviationProfilesData } from "./deviationsSlice";

export function useHandleDeviations() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const deviation = useAppSelector(selectDeviations);
    const profile = useAppSelector(selectDeviationProfilesData);
    const dispatch = useAppDispatch();

    useEffect(
        function handleDeviationChanges() {
            if (deviation.index > 0 && profile.length < 2) {
                dispatch(
                    renderActions.setPoints({
                        deviation: {
                            index: 0,
                        },
                    })
                );
            }
        },
        [profile, deviation, dispatch]
    );

    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            view.modifyRenderState({ points: { deviation } });
        },
        [view, deviation]
    );
}
