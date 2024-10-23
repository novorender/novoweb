import { ObjectId } from "@novorender/webgl-api";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";
import { getFilePathFromObjectPath } from "utils/objectData";
import { getObjectData } from "utils/search";

import { selectProfile, selectSelectedPath } from "./followPathSlice";

export function useCrossSection() {
    const {
        state: { view, db },
    } = useExplorerGlobals();

    const followProfile = useAppSelector(selectProfile);
    const centerLine = useAppSelector(selectSelectedPath);
    const dispatch = useAppDispatch();

    const [objects, setObjects] = useState<AsyncState<Set<ObjectId>>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        loadCrossSections();

        async function loadCrossSections() {
            if (centerLine === undefined || view === undefined || db === undefined) {
                setObjects({ status: AsyncStatus.Success, data: new Set() });
                return;
            }
            setObjects({ status: AsyncStatus.Loading });

            const data = await getObjectData({ db, id: centerLine, view });
            if (data) {
                const objectPath = data.path;
                const filePath = getFilePathFromObjectPath(objectPath);
                if (!filePath) {
                    setObjects({ status: AsyncStatus.Success, data: new Set() });
                    return;
                }
                const iterator = db.search({ parentPath: filePath, descentDepth: 0 }, undefined);
                const fileId = (await iterator.next()).value;
                const filter = new Set(await db.descendants(fileId, undefined));

                try {
                    setObjects({ status: AsyncStatus.Success, data: filter });
                } catch {
                    setObjects({ status: AsyncStatus.Error, msg: "An error occurred." });
                }
            }
        }
    }, [view, db, dispatch, followProfile, centerLine]);

    return objects;
}
