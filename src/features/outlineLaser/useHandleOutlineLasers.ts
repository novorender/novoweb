import { vec3 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    clippingOutlineLaserActions,
    OutlineLaser,
    selectOutlineLaserPlane,
    selectOutlineLasers,
} from "features/outlineLaser";
import { CameraType, selectCamera, selectClippingPlanes } from "features/render";

export function useHandleOutlineLasers() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const { planes } = useAppSelector(selectClippingPlanes);
    const outlineLasers = useAppSelector(selectOutlineLasers);
    const tracePlane = useAppSelector(selectOutlineLaserPlane);
    const dispatch = useAppDispatch();
    const cameraState = useAppSelector(selectCamera);

    const tracesRef = useRef(outlineLasers);
    const tracePlaneRef = useRef(tracePlane);
    const generationRef = useRef(0);

    useEffect(() => {
        tracesRef.current = outlineLasers;
        tracePlaneRef.current = tracePlane;
    }, [tracePlane, outlineLasers]);

    useEffect(() => {
        updateTraces();

        async function updateTraces() {
            if (planes.length === 0) {
                if (tracesRef.current.length > 0) {
                    dispatch(clippingOutlineLaserActions.clear());
                }
                return;
            }
            generationRef.current++;
            const generation = generationRef.current;
            //We need a sleep to make sure the pick buffer is ready.
            const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
            await sleep(100);
            if (generation < generationRef.current) {
                return;
            }
            const measureView = await view?.measure;
            const currentTracePlane = tracePlaneRef.current;
            const currentTraces = tracesRef.current;
            if (currentTracePlane && view && measureView && currentTraces.length > 0) {
                const newPlane = planes[0].normalOffset;
                const oldDir = vec3.fromValues(currentTracePlane[0], currentTracePlane[1], currentTracePlane[2]);
                const newDir = vec3.fromValues(newPlane[0], newPlane[1], newPlane[2]);
                if (generation < generationRef.current) {
                    return;
                }

                if (vec3.dot(oldDir, newDir) < 0.9) {
                    dispatch(clippingOutlineLaserActions.setLaserPlane(undefined));
                    dispatch(clippingOutlineLaserActions.clear());
                    return;
                }

                const diff = newPlane[3] - currentTracePlane[3];
                if (diff === 0) {
                    return;
                }
                const newTraces: OutlineLaser[] = [];

                for (const trace of currentTraces) {
                    const newTracerPosition = vec3.scaleAndAdd(vec3.create(), trace.laserPosition, oldDir, diff);
                    const sp = measureView.draw.toMarkerPoints([newTracerPosition]);
                    if (sp && sp.length > 0 && sp[0]) {
                        const outlineValues = await view.outlineLaser(
                            sp[0],
                            cameraState.type === CameraType.Orthographic || planes.length === 0
                                ? undefined
                                : { laserPosition3d: newTracerPosition, plane: planes[0].normalOffset }
                        );

                        if (
                            outlineValues &&
                            ((outlineValues.down.length > 0 && outlineValues.up.length > 0) ||
                                (outlineValues.left.length > 0 && outlineValues.right.length > 0))
                        ) {
                            newTraces.push({
                                left: outlineValues.left.map((p) => p.position),
                                right: outlineValues.right.map((p) => p.position),
                                down: outlineValues.down.map((p) => p.position),
                                up: outlineValues.up.map((p) => p.position),
                                laserPosition: newTracerPosition,
                                measurementX:
                                    trace.measurementX &&
                                    outlineValues.left.length > 0 &&
                                    outlineValues.right.length > 0
                                        ? { startIdx: 0, endIdx: 0 }
                                        : undefined,
                                measurementY:
                                    trace.measurementY && outlineValues.down.length > 0 && outlineValues.up.length > 0
                                        ? { startIdx: 0, endIdx: 0 }
                                        : undefined,
                            });
                        }
                    }
                }
                if (generation < generationRef.current) {
                    return;
                }
                dispatch(clippingOutlineLaserActions.setLaserPlane(view.renderState.clipping.planes[0].normalOffset));
                dispatch(clippingOutlineLaserActions.setLasers(newTraces));
            }
        }
    }, [planes, view, cameraState, dispatch]);
}
