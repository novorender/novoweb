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
    const selectedId = useAppSelector(selectManholeId);

    useEffect(() => {
        loadManholeValues();

        async function loadManholeValues() {
            if (measureScene) {
                const manhole = selectedId
                    ? ((await measureScene.inspectObject(selectedId, "manhole")) as ManholeMeasureValues)
                    : undefined;
                dispatch(manholeActions.setManholeValues(manhole));
            }
        }
    }, [selectedId, dispatch, measureScene]);
}
