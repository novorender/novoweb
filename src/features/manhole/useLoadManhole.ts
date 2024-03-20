import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { manholeActions, selectIsManholePinned, selectManholeId } from "./manholeSlice";

export function useLoadManhole() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const selectedObj = useAppSelector(selectManholeId);
    const selectManhole = !useAppSelector(selectIsManholePinned);

    useEffect(() => {
        loadManholeValues();

        async function loadManholeValues() {
            if (!view?.measure) {
                return;
            }

            if (selectManhole) {
                if (!selectedObj) {
                    dispatch(manholeActions.setManholeValues(undefined));
                    return;
                }

                dispatch(manholeActions.setLoadingBrep(true));
                dispatch(manholeActions.setManholeValues(await view.measure.manhole.measure(selectedObj)));
                dispatch(manholeActions.setLoadingBrep(false));
            }
        }
    }, [selectedObj, dispatch, view, selectManhole]);
}
