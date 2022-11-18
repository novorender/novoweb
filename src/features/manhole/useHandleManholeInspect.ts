import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { manholeActions, selectIsManholePinned, selectManholeId } from "./manholeSlice";

export function useHandleManholeInspect() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const selectedObj = useAppSelector(selectManholeId);
    const selectManhole = !useAppSelector(selectIsManholePinned);

    useEffect(() => {
        loadManholeValues();

        async function loadManholeValues() {
            if (!measureScene) {
                return;
            }

            if (selectManhole) {
                if (!selectedObj) {
                    dispatch(manholeActions.setManholeValues(undefined));
                    return;
                }

                dispatch(manholeActions.setLoadingBrep(true));
                dispatch(manholeActions.setManholeValues(await measureScene.inspectObject(selectedObj, "manhole")));
                dispatch(manholeActions.setLoadingBrep(false));
            } else {
            }
        }
    }, [selectedObj, dispatch, measureScene, selectManhole]);
}
