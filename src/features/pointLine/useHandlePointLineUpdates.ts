import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { pointLineActions, selectPointLine } from "./pointLineSlice";

export function useHandlePointLineUpdates() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const { points } = useAppSelector(selectPointLine);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!measureScene) {
            return;
        }

        if (!points.length) {
            dispatch(pointLineActions.setResult(undefined));
        } else {
            dispatch(pointLineActions.setResult(measureScene.measureLineStrip(points)));
        }
    }, [points, dispatch, measureScene]);

    return;
}
