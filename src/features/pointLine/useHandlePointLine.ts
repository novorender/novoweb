import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { pointLineActions, selectPointLine } from "./pointLineSlice";

export function useHandlePointLine() {
    const {
        state: { measureView },
    } = useExplorerGlobals();

    const { points } = useAppSelector(selectPointLine);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!measureView) {
            return;
        }

        if (!points.length) {
            dispatch(pointLineActions.setResult(undefined));
        } else {
            dispatch(pointLineActions.setResult(measureView.core.measureLineStrip(points)));
        }
    }, [points, dispatch, measureView]);

    return;
}
