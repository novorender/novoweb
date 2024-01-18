import { FollowParametricObject } from "@novorender/api";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";

import { followPathActions, selectFollowCylindersFrom, selectSelectedIds } from "./followPathSlice";

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
            try {
                const fp = await view.measure?.followPath.followParametricObjects(toFollow, {
                    cylinderMeasure: followFrom,
                });

                if (!fp) {
                    setObjects({ status: AsyncStatus.Error, msg: "Selected objects can't be followed." });
                    dispatch(followPathActions.setFollowObject(undefined));
                    return;
                }

                setObjects({ status: AsyncStatus.Success, data: fp });
                dispatch(followPathActions.setFollowObject(fp));
            } catch (e) {
                setObjects({ status: AsyncStatus.Error, msg: "An error occurred." });
                dispatch(followPathActions.setFollowObject(undefined));
            }
        }
    }, [toFollow, view, dispatch, followFrom]);

    return objects;
}
