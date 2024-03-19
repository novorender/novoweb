import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";
import { getObjectNameFromPath, getParentPath } from "utils/objectData";
import { searchByPatterns } from "utils/search";

import { followPathActions, selectLandXmlPaths } from "../followPathSlice";

export function useLoadLandXmlPath({ skip }: { skip?: boolean } = {}) {
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!skip && landXmlPaths.status === AsyncStatus.Initial) {
            getLandXmlPaths();
        }

        async function getLandXmlPaths() {
            dispatch(followPathActions.setPaths({ status: AsyncStatus.Loading }));

            try {
                let paths = [] as {
                    id: number;
                    name: string;
                }[];

                await searchByPatterns({
                    db,
                    searchPatterns: [{ property: "Novorender/PathId" }],
                    callback: (refs) =>
                        (paths = paths.concat(
                            refs.map(({ path, id }) => ({ id, name: getObjectNameFromPath(getParentPath(path)) }))
                        )),
                });

                if (paths.length == 0) {
                    //Legacy
                    await searchByPatterns({
                        db,
                        searchPatterns: [{ property: "Novorender/Path", value: "true", exact: true }],
                        callback: (refs) =>
                            (paths = paths.concat(
                                refs.map(({ path, id }) => ({ id, name: getObjectNameFromPath(getParentPath(path)) }))
                            )),
                    });
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
    }, [db, landXmlPaths, dispatch, skip]);
}
