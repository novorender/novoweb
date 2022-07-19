import { useEffect, useState } from "react";
import { FollowParametricObject, MeasureObject } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectSelectedPaths } from "./followPathSlice";

type ExtendedMeasureObject = {
    fp?: FollowParametricObject;
    pos: vec3;
} & MeasureObject;

export function usePathMeasureObjects() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const selected = useAppSelector(selectSelectedPaths);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState([] as ExtendedMeasureObject[]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            if (!measureScene) {
                return;
            }

            setIsLoading(true);
            const mObjects = (
                await Promise.all(
                    selected.map((obj) =>
                        measureScene
                            .downloadMeasureObject(obj.id, obj.pos)
                            .then((_mObj) => {
                                const mObj = _mObj as ExtendedMeasureObject;

                                if (!mObj.selectedEntity || mObj.selectedEntity.kind === "vertex") {
                                    return;
                                } else {
                                    mObj.pos = obj.pos;
                                    return mObj;
                                }
                            })
                            .then(async (mObj) => {
                                if (!mObj) {
                                    return;
                                }

                                mObj.fp = await measureScene.followParametricObject(obj.id, obj.pos);

                                return mObj;
                            })
                            .catch(() => undefined)
                    )
                )
            ).filter((obj) => obj !== undefined) as ExtendedMeasureObject[];

            setMeasureObjects(mObjects);
            setIsLoading(false);
        }
    }, [measureScene, selected, dispatch]);

    return [measureObjects, isLoading] as const;
}
