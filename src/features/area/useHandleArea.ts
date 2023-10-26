import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { areaActions, selectAreaPoints } from "./areaSlice";

export function useHandleArea() {
    const {
        state: { measureView },
    } = useExplorerGlobals();
    const points = useAppSelector(selectAreaPoints);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!measureView) {
            return;
        }

        if (!points.length) {
            dispatch(areaActions.setDrawPoints([]));
            dispatch(areaActions.setArea(0));
            return;
        }

        console.log(points.map((pts) => pts[1]));
        const area = measureView.core.areaFromPolygon(
            points.map((pts) => pts[0]),
            points.map((pts) => pts[1])
        );

        dispatch(areaActions.setDrawPoints(area.polygon as vec3[]));
        dispatch(areaActions.setArea(area.area ?? 0));
    }, [points, dispatch, measureView]);
}
