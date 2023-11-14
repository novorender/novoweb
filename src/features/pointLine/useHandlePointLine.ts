import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { pointLineActions, selectPointLine } from "./pointLineSlice";

export function useHandlePointLine() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const { points } = useAppSelector(selectPointLine);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!view?.measure) {
            return;
        }

        if (!points.length) {
            dispatch(pointLineActions.setResult(undefined));
        } else {
            dispatch(pointLineActions.setResult(view.measure.core.measureLineStrip(points)));
        }
    }, [points, dispatch, view]);

    return;
}
