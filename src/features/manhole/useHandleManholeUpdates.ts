import { useEffect } from "react";
import { ManholeMeasureValues } from "@novorender/measure-api";

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

            dispatch(manholeActions.setLoadingBrep(true));
            const manhole = selectedObj
                ? // TODO(SIGVE): fix type
                  ((await measureScene.inspectObject(selectedObj, "manhole")) as ManholeMeasureValues)
                : undefined;
            dispatch(manholeActions.setManholeValues(manhole));
            dispatch(manholeActions.setLoadingBrep(false));
        }
    }, [selectedObj, dispatch, measureScene]);
}
