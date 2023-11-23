import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { areaActions, selectBookmarkPoints, selectCurrentAreaPoints } from "./areaSlice";

export function useHandleArea() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const points = useAppSelector(selectCurrentAreaPoints);
    const bookmarkPoints = useAppSelector(selectBookmarkPoints);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!view?.measure) {
            return;
        }

        if (!points.length) {
            dispatch(areaActions.setDrawPoints([]));
            dispatch(areaActions.setArea(0));
            return;
        }

        const area = view.measure.core.areaFromPolygon(
            points.map((pts) => pts[0]),
            points.map((pts) => pts[1])
        );

        dispatch(areaActions.setDrawPoints(area.polygon as vec3[]));
        dispatch(areaActions.setArea(area.area ?? 0));
    }, [points, dispatch, view]);

    useEffect(() => {
        if (!view?.measure) {
            return;
        }
        for (let i = 0; i < bookmarkPoints.length; ++i) {
            dispatch(areaActions.newArea());
            const bkPts = bookmarkPoints[i];
            if (!bkPts.length) {
                dispatch(areaActions.setDrawPoints([]));
                dispatch(areaActions.setArea(0));
                continue;
            }

            const area = view.measure.core.areaFromPolygon(
                bkPts.map((pts) => pts[0]),
                bkPts.map((pts) => pts[1])
            );

            dispatch(areaActions.setPoints(bkPts));
            dispatch(areaActions.setDrawPoints(area.polygon as vec3[]));
            dispatch(areaActions.setArea(area.area ?? 0));
        }
    }, [bookmarkPoints, dispatch, view]);
}
