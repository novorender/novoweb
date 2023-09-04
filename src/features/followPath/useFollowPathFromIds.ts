import { FollowParametricObject } from "@novorender/api";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";

import { selectFollowCylindersFrom, selectSelectedIds } from "./followPathSlice";

export function useFollowPathFromIds() {
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const followFrom = useAppSelector(selectFollowCylindersFrom);
    const toFollow = useAppSelector(selectSelectedIds);
    const dispatch = useAppDispatch();

    const [objects, setObjects] = useState<AsyncState<FollowParametricObject>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        loadFpObjects();

        async function loadFpObjects() {
            setObjects({ status: AsyncStatus.Loading });
            const measureView = await view.measure;

            try {
                const fp = await measureView.followPath.followParametricObjects(toFollow, {
                    cylinderMeasure: followFrom,
                });

                if (!fp) {
                    setObjects({ status: AsyncStatus.Error, msg: "Selected objects can't be followed." });
                    return;
                }

                setObjects({ status: AsyncStatus.Success, data: fp });
            } catch (e) {
                setObjects({ status: AsyncStatus.Error, msg: "An error occurred." });
            }
        }
    }, [toFollow, view, dispatch, followFrom]);

    return objects;
}
