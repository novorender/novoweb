import { useEffect } from "react";
import { vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { areaActions, selectAreaPoints } from "./areaSlice";

export function useHandleAreaPoints() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();
    const points = useAppSelector(selectAreaPoints);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!measureScene) {
            return;
        }

        const area = measureScene.areaFromPolygon(
            points.map((pts) => pts[0]),
            points.map((pts) => pts[1])
        );

        dispatch(areaActions.setDrawPoints(area.polygon as vec3[]));
        dispatch(areaActions.setArea(area.area));
    }, [points, dispatch, measureScene]);
}
