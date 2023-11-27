import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { areaActions, selectAreaBookmarkPoints, selectCurrentArea } from "./areaSlice";

export function useHandleArea() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const currentArea = useAppSelector(selectCurrentArea);
    const bookmarkPoints = useAppSelector(selectAreaBookmarkPoints);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!view?.measure) {
            return;
        }
        if (currentArea.points.length === 0 && currentArea.drawPoints.length === 0) {
            return;
        }

        if (!currentArea.points.length) {
            dispatch(areaActions.setDrawPoints([]));
            dispatch(areaActions.setArea(0));
            return;
        }

        const area = view.measure.core.areaFromPolygon(currentArea.points, currentArea.normals);

        dispatch(areaActions.setDrawPoints(area.polygon as vec3[]));
        dispatch(areaActions.setArea(area.area ?? 0));
    }, [currentArea, dispatch, view]);

    useEffect(() => {
        if (!view?.measure) {
            return;
        }
        for (let i = 0; i < bookmarkPoints.length; ++i) {
            dispatch(areaActions.newArea());
            const bkPts = bookmarkPoints[i];
            if (!bkPts.points.length) {
                dispatch(areaActions.setDrawPoints([]));
                dispatch(areaActions.setArea(0));
                continue;
            }

            const area = view.measure.core.areaFromPolygon(bkPts.points, bkPts.normals);

            dispatch(areaActions.setPoints({ points: bkPts.points, normals: bkPts.normals }));
            dispatch(areaActions.setDrawPoints(area.polygon as vec3[]));
            dispatch(areaActions.setArea(area.area ?? 0));
        }
    }, [bookmarkPoints, dispatch, view]);
}
