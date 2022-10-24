import { useEffect, useState } from "react";
import { FollowParametricObject, MeasureEntity } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectSelectedPositions } from "./followPathSlice";
import { AsyncState, AsyncStatus } from "types/misc";

type ExtendedMeasureObject = {
    fp?: FollowParametricObject;
    pos: vec3;
} & MeasureEntity;

export function usePathMeasureObjects() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const selected = useAppSelector(selectSelectedPositions);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState<AsyncState<ExtendedMeasureObject[]>>({
        status: AsyncStatus.Initial,
    });

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            if (!measureScene) {
                return;
            }

            setMeasureObjects({ status: AsyncStatus.Loading });
            const mObjects = (
                await Promise.all(
                    selected.map((obj) =>
                        measureScene
                            .pickMeasureEntity(obj.id, obj.pos)
                            .then((_mObj) => {
                                const mObj = _mObj as ExtendedMeasureObject;
                                mObj.pos = obj.pos;
                                return mObj;
                            })
                            .then(async (mObj) => {
                                if (mObj.drawKind === "vertex") {
                                    return;
                                }
                                mObj.fp = await measureScene.followParametricObjectFromPosition(obj.id, obj.pos);
                                mObj.pos = obj.pos;
                                return mObj;
                            })
                            .catch(() => undefined)
                    )
                )
            ).filter((obj) => obj !== undefined) as ExtendedMeasureObject[];

            setMeasureObjects({ status: AsyncStatus.Success, data: mObjects });
        }
    }, [measureScene, selected, dispatch]);

    return measureObjects;
}
