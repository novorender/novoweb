import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { manholeActions, selectManholeId } from "./manholeSlice";

export function useHandleManholeUpdates() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const selectedObj = useAppSelector(selectManholeId);

    useEffect(() => {
        loadManholeValues();

        async function loadManholeValues() {
            if (!measureScene) {
                return;
            }

            if (!selectedObj) {
                dispatch(manholeActions.setManholeValues(undefined));
                return;
            }

            dispatch(manholeActions.setLoadingBrep(true));
            dispatch(manholeActions.setManholeValues(await measureScene.inspectObject(selectedObj, "manhole")));
            dispatch(manholeActions.setLoadingBrep(false));
        }
    }, [selectedObj, dispatch, measureScene]);
}
