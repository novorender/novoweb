import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { clippingOutlineLaserActions, OutlineGroup, selectOutlineGroups } from "features/outlineLaser";
import { selectIsOnline } from "slices/explorer";
import { VecRGB } from "utils/color";
import { getFilePathFromObjectPath } from "utils/objectData";
import { getObjectData, searchByPatterns } from "utils/search";
import { sleep } from "utils/time";

import { selectClippingPlanes } from "../renderSlice";

export function useHandleClippingOutlines() {
    const {
        state: { view, db },
    } = useExplorerGlobals();
    const { planes } = useAppSelector(selectClippingPlanes);
    const outlineGroups = useAppSelector(selectOutlineGroups);
    const isOnline = useAppSelector(selectIsOnline);
    const dispatch = useAppDispatch();

    const groupRef = useRef(outlineGroups);
    const idsGenerationRef = useRef(0);

    useEffect(() => {
        groupRef.current = outlineGroups;
    }, [outlineGroups]);

    useEffect(() => {
        groupRef.current = [];
    }, [planes]);

    useEffect(() => {
        updateClippedFiles();
        async function updateClippedFiles() {
            //This function will not work unless the pick buffer is ready. As this can be called from bookmark a long sleep is required for everything to be set up
            const id = ++idsGenerationRef.current;
            await sleep(2000);

            if (!db || !view || groupRef.current.length !== 0 || id !== idsGenerationRef.current) {
                return;
            }

            if (isOnline) {
                const getFileId = async (fileName: string) => {
                    const iterator = db.search({ parentPath: fileName, descentDepth: 0 }, undefined);
                    const fileId = (await iterator.next()).value;
                    if (!fileId) {
                        return [];
                    }
                    return db.descendants(fileId, undefined);
                };

                const objIds = view.getOutlineObjectsOnScreen();
                if (!objIds.size) {
                    dispatch(clippingOutlineLaserActions.setOutlineGroups([]));
                    return;
                }

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
                const files: OutlineGroup[] = [];

                let i = 0;
                const increments = 360 / filePaths.size;
                for (const f of filePaths) {
                    const ids = await getFileId(f);
                    files.push({ name: f, color: hsl2rgb(increments * i, 1, 0.5) as VecRGB, hidden: false, ids });
                    ++i;
                }
                dispatch(clippingOutlineLaserActions.setOutlineGroups(files));
            } else {
                const objIds = await view.getOutlineObjectsOnScreen();
                if (!objIds) {
                    dispatch(clippingOutlineLaserActions.setOutlineGroups([]));
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
                    clippingOutlineLaserActions.setOutlineGroups(
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
    }, [db, view, dispatch, planes, isOnline]);
}

function hsl2rgb(h: number, s: number, l: number): VecRGB {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return [f(0), f(8), f(4)];
}
