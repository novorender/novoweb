import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useSceneId } from "hooks/useSceneId";
import { selectIsOnline } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { getManualCache } from "utils/manualCache";
import { getObjectNameFromPath, getParentPath } from "utils/objectData";
import { searchByPatterns } from "utils/search";

import { followPathActions, selectLandXmlPaths } from "../followPathSlice";
import { LandXmlPath } from "../types";

export function useLoadLandXmlPath({ skip }: { skip?: boolean } = {}) {
    const {
        state: { db },
    } = useExplorerGlobals();
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const dispatch = useAppDispatch();
    const projectId = useSceneId();
    const isOnline = useAppSelector(selectIsOnline);
    const isOnlineRef = useRef(isOnline);
    useEffect(() => {
        isOnlineRef.current = isOnline;
    });

    useEffect(() => {
        if (!skip && landXmlPaths.status === AsyncStatus.Initial) {
            getLandXmlPaths();
        }

        async function getLandXmlPaths() {
            if (!db) {
                return;
            }

            dispatch(followPathActions.setPaths({ status: AsyncStatus.Loading }));

            const cacheKey = `/derived/projects/${projectId}/landXmlPaths`;

            try {
                let paths = [] as LandXmlPath[];

                const cache = await getManualCache();

                if (!isOnlineRef.current) {
                    const resp = await cache.match(cacheKey);
                    if (resp) {
                        paths = await resp.json();
                    } else {
                        throw new Error("No cached value for land XML paths");
                    }
                } else {
                    const refsWithPathId: HierarcicalObjectReference[] = [];

                    await searchByPatterns({
                        db,
                        searchPatterns: [{ property: "Novorender/PathId" }],
                        full: true,
                        callback: (refs) => {
                            refsWithPathId.push(...refs);
                        },
                    });

                    paths = await Promise.all(
                        refsWithPathId.map(async (ref) => {
                            const meta = await ref.loadMetaData();
                            return {
                                id: ref.id,
                                name: getObjectNameFromPath(getParentPath(ref.path)),
                                brepId: meta.properties.find((p) => p[0] === "Novorender/PathId")![1],
                            };
                        })
                    );

                    if (paths.length == 0) {
                        //Legacy
                        await searchByPatterns({
                            db,
                            searchPatterns: [{ property: "Novorender/Path", value: "true", exact: true }],
                            callback: (refs) =>
                                (paths = paths.concat(
                                    refs.map(({ path, id }) => ({
                                        id,
                                        name: getObjectNameFromPath(getParentPath(path)),
                                    }))
                                )),
                        });
                    }

                    cache.put(cacheKey, Response.json(paths));
                }

                paths.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));
                dispatch(followPathActions.setPaths({ status: AsyncStatus.Success, data: paths }));
            } catch (e) {
                console.warn(e);
                dispatch(
                    followPathActions.setPaths({
                        status: AsyncStatus.Error,
                        msg: "Failed to load list of paths to follow.",
                    })
                );
            }
        }
    }, [db, landXmlPaths, dispatch, skip, projectId]);
}
