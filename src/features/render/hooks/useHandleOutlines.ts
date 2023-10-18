import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, selectCamera, selectClippingPlanes } from "../renderSlice";
import {
    OutlineLaser,
    clippingOutlineActions,
    selectOutlineGroups,
    selectOutlineLaserPlane,
    selectOutlineLasers,
} from "features/clippingOutline";
import { vec3 } from "gl-matrix";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { searchByPatterns } from "utils/search";
import { getFilePathFromObjectPath } from "utils/objectData";
import { ClippedFile } from "features/clippingOutline/clippedObject";
import { VecRGB } from "utils/color";

export function useHandleOutlines() {
    const {
        state: { view, db },
    } = useExplorerGlobals();
    const { planes } = useAppSelector(selectClippingPlanes);
    const outlineLasers = useAppSelector(selectOutlineLasers);
    const tracePlane = useAppSelector(selectOutlineLaserPlane);
    const outlineGroups = useAppSelector(selectOutlineGroups);
    const dispatch = useAppDispatch();
    const cameraState = useAppSelector(selectCamera);

    const tracesRef = useRef(outlineLasers);
    const tracePlaneRef = useRef(tracePlane);
    const groupRef = useRef(outlineGroups);

    useEffect(() => {
        tracesRef.current = outlineLasers;
        tracePlaneRef.current = tracePlane;
    }, [tracePlane, outlineLasers]);

    useEffect(() => {
        groupRef.current = outlineGroups;
    }, [outlineGroups]);

    useEffect(() => {
        updateClippedFiles();
        async function updateClippedFiles() {
            const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
            await sleep(1000);
            if (db && view && groupRef.current.length === 0) {
                const getFileId = async (fileName: string) => {
                    const iterator = db.search({ parentPath: fileName, descentDepth: 0 }, undefined);
                    const fileId = (await iterator.next()).value;
                    return db.descendants(fileId, undefined);
                };

                const objIds = await view.getOutlineObjectsOnScreen();
                if (objIds) {
                    const filePaths = new Set<string>();
                    await searchByPatterns({
                        db,
                        searchPatterns: [{ property: "id", value: Array.from(objIds).map((v) => String(v)) }],
                        full: false,
                        callback: (files) => {
                            for (const file of files) {
                                const f = getFilePathFromObjectPath(file.path);
                                if (f) {
                                    filePaths.add(f);
                                }
                            }
                        },
                    });
                    const files: ClippedFile[] = [];

                    function hsl2rgb(h: number, s: number, l: number) {
                        let a = s * Math.min(l, 1 - l);
                        let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                        return [f(0), f(8), f(4)];
                    }
                    let i = 0;
                    const increments = 360 / filePaths.size;
                    for (const f of filePaths) {
                        const ids = await getFileId(f);
                        files.push({ name: f, color: hsl2rgb(increments * i, 1, 0.5) as VecRGB, hidden: false, ids });
                        ++i;
                    }
                    dispatch(clippingOutlineActions.setOutlineGroups(files));
                }
            }
        }
    }, [db, view, dispatch, planes]);

    useEffect(() => {
        updateTraces();

        async function updateTraces() {
            if (planes.length === 0) {
                return;
            }
            const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
            await sleep(100);
            const measureView = await view?.measure;
            const currentTracePlane = tracePlaneRef.current;
            const currentTraces = tracesRef.current;
            if (currentTracePlane && view && measureView && currentTraces.length > 0) {
                const newPlane = planes[0].normalOffset;
                const oldDir = vec3.fromValues(currentTracePlane[0], currentTracePlane[1], currentTracePlane[2]);
                const newDir = vec3.fromValues(newPlane[0], newPlane[1], newPlane[2]);
                if (vec3.dot(oldDir, newDir) < 0.9) {
                    dispatch(clippingOutlineActions.setLaserPlane(undefined));
                    dispatch(clippingOutlineActions.clear());
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
                                    outlineValues.left.length > 0 && outlineValues.right.length > 0
                                        ? { startIdx: 0, endIdx: 0 }
                                        : undefined,
                                measurementY:
                                    outlineValues.down.length > 0 && outlineValues.up.length > 0
                                        ? { startIdx: 0, endIdx: 0 }
                                        : undefined,
                            });
                        }
                    }
                }
                dispatch(clippingOutlineActions.setLaserPlane(view.renderState.clipping.planes[0].normalOffset));
                dispatch(clippingOutlineActions.setLasers(newTraces));
            }
        }
    }, [planes, view, cameraState, dispatch]);
}
