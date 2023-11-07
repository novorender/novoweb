import { vec3 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    clippingOutlineActions,
    OutlineLaser,
    selectOutlineGroups,
    selectOutlineLaserPlane,
    selectOutlineLasers,
} from "features/clippingOutline";
import { ClippedFile } from "features/clippingOutline/clippedObject";
import { VecRGB } from "utils/color";
import { getFilePathFromObjectPath } from "utils/objectData";
import { getObjectData, searchByPatterns } from "utils/search";
import { sleep } from "utils/time";

import { CameraType, selectCamera, selectClippingPlanes } from "../renderSlice";

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
    const generationRef = useRef(0);

    useEffect(() => {
        tracesRef.current = outlineLasers;
        tracePlaneRef.current = tracePlane;
    }, [tracePlane, outlineLasers]);

    useEffect(() => {
        groupRef.current = outlineGroups;
    }, [outlineGroups]);

    useEffect(() => {
        if (!planes.length) {
            groupRef.current = [];
        }
    }, [planes]);

    useEffect(() => {
        updateClippedFiles();
        async function updateClippedFiles() {
            //This function will not work unless the pick buffer is ready. As this can be called from bookmark a long sleep is required for everything to be set up
            await sleep(1000);
            if (!db || !view || groupRef.current.length !== 0) {
                return;
            }

            if (navigator.onLine) {
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

                    let i = 0;
                    const increments = 360 / filePaths.size;
                    for (const f of filePaths) {
                        const ids = await getFileId(f);
                        files.push({ name: f, color: hsl2rgb(increments * i, 1, 0.5) as VecRGB, hidden: false, ids });
                        ++i;
                    }
                    dispatch(clippingOutlineActions.setOutlineGroups(files));
                }
            } else {
                const objIds = await view.getOutlineObjectsOnScreen();
                if (!objIds) {
                    return;
                }

                const files = (
                    await Promise.all(
                        Array.from(objIds).map(async (id) => {
                            const data = await getObjectData({ db, view, id });
                            if (!data) {
                                return;
                            }

                            return { id, path: data.path };
                        })
                    )
                )
                    .filter((obj): obj is NonNullable<typeof obj> => obj !== undefined)
                    .reduce((prev, val) => {
                        const file = getFilePathFromObjectPath(val.path);

                        if (!file) {
                            return prev;
                        }

                        if (!prev[file]) {
                            prev[file] = [val.id];
                        } else {
                            prev[file].push(val.id);
                        }

                        return prev;
                    }, {} as Record<string, number[]>);

                dispatch(
                    clippingOutlineActions.setOutlineGroups(
                        Object.keys(files).map((key, idx, arr) => ({
                            name: key,
                            color: hsl2rgb((360 / arr.length) * idx, 1, 0.5),
                            hidden: false,
                            ids: files[key],
                        }))
                    )
                );
            }
        }
    }, [db, view, dispatch, planes]);

    useEffect(() => {
        updateTraces();

        async function updateTraces() {
            if (planes.length === 0) {
                if (tracesRef.current.length > 0) {
                    dispatch(clippingOutlineActions.clear());
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
                dispatch(clippingOutlineActions.setLaserPlane(view.renderState.clipping.planes[0].normalOffset));
                dispatch(clippingOutlineActions.setLasers(newTraces));
            }
        }
    }, [planes, view, cameraState, dispatch]);
}

function hsl2rgb(h: number, s: number, l: number): VecRGB {
    let a = s * Math.min(l, 1 - l);
    let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return [f(0), f(8), f(4)];
}
