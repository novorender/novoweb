import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { manholeActions, selectIsManholePinned, selectManholeId } from "./manholeSlice";

export function useLoadManhole() {
    const {
        state: { measureView },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const selectedObj = useAppSelector(selectManholeId);
    const selectManhole = !useAppSelector(selectIsManholePinned);

    useEffect(() => {
        loadManholeValues();

        async function loadManholeValues() {
            if (!measureView) {
                return;
            }

            if (selectManhole) {
                if (!selectedObj) {
                    dispatch(manholeActions.setManholeValues(undefined));
                    return;
                }

                dispatch(manholeActions.setLoadingBrep(true));
                dispatch(manholeActions.setManholeValues(await measureView.manhole.measure(selectedObj)));
                dispatch(manholeActions.setLoadingBrep(false));
            } else {
            }
        }
    }, [selectedObj, dispatch, measureView, selectManhole]);
}
