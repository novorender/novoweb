import { FollowParametricObject, MeasureEntity } from "@novorender/api";
import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";

import { selectFollowCylindersFrom, selectSelectedPositions } from "./followPathSlice";

type ExtendedMeasureObject = {
    fp?: FollowParametricObject;
    pos: vec3;
} & MeasureEntity;

export function usePathMeasureObjects() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const selected = useAppSelector(selectSelectedPositions);
    const followFrom = useAppSelector(selectFollowCylindersFrom);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState<AsyncState<ExtendedMeasureObject[]>>({
        status: AsyncStatus.Initial,
    });

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            setMeasureObjects({ status: AsyncStatus.Loading });
            const mObjects = (
                await Promise.all(
                    selected.map((obj) =>
                        view?.measure?.core
                            .pickMeasureEntity(obj.id, obj.pos)
                            .then((_mObj) => {
                                const mObj = _mObj.entity as ExtendedMeasureObject;
                                mObj.pos = obj.pos;
                                return mObj;
                            })
                            .then(async (mObj) => {
                                if (mObj.drawKind === "vertex") {
                                    return;
                                }
                                mObj.fp = await view?.measure?.followPath.followParametricObjectFromPosition(
                                    obj.id,
                                    obj.pos,
                                    {
                                        cylinderMeasure: followFrom,
                                    }
                                );
                                mObj.pos = obj.pos;
                                return mObj;
                            })
                            .catch(() => undefined)
                    )
                )
            ).filter((obj) => obj !== undefined) as ExtendedMeasureObject[];

            setMeasureObjects({ status: AsyncStatus.Success, data: mObjects });
        }
    }, [view, selected, dispatch, followFrom]);

    return measureObjects;
}
