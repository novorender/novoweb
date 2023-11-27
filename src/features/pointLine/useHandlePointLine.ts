import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { pointLineActions, selectPointLine, selectPointLineBookmarkPoints } from "./pointLineSlice";

export function useHandlePointLine() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const { points } = useAppSelector(selectPointLine);
    const bookmarkPoints = useAppSelector(selectPointLineBookmarkPoints);
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

    useEffect(() => {
        if (!view?.measure) {
            return;
        }
        for (let i = 0; i < bookmarkPoints.length; ++i) {
            dispatch(pointLineActions.newPointLine());
            const bkPts = bookmarkPoints[i];
            if (!bkPts.length) {
                dispatch(pointLineActions.setResult(undefined));
                continue;
            }

            dispatch(pointLineActions.setPoints(bkPts));
            dispatch(pointLineActions.setResult(view.measure.core.measureLineStrip(bkPts)));
        }
    }, [bookmarkPoints, dispatch, view]);

    return;
}
