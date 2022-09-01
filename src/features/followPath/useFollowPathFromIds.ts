import { FollowParametricObject } from "@novorender/measure-api";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectSelectedIds } from "./followPathSlice";

export function useFollowPathFromIds() {
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);

    const toFollow = useAppSelector(selectSelectedIds);
    const dispatch = useAppDispatch();

    const [objects, setObjects] = useState<AsyncState<FollowParametricObject>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        loadFpObjects();

        async function loadFpObjects() {
            setObjects({ status: AsyncStatus.Loading });

            try {
                const fp = await measureScene.followParametricObjects(toFollow);

                if (!fp) {
                    setObjects({ status: AsyncStatus.Error, msg: "Selected objects can't be followed." });
                    return;
                }

                setObjects({ status: AsyncStatus.Success, data: fp });
            } catch (e) {
                setObjects({ status: AsyncStatus.Error, msg: "An error occured." });
            }
        }
    }, [toFollow, measureScene, dispatch]);

    return objects;
}
