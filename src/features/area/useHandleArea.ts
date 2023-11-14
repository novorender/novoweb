import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { areaActions, selectAreaPoints } from "./areaSlice";

export function useHandleArea() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const points = useAppSelector(selectAreaPoints);

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
}
