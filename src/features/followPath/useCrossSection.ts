import { RoadCrossSection } from "@novorender/measure-api";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectDrawRoadIds, selectFollowCylindersFrom, selectProfile, selectSelectedIds } from "./followPathSlice";

export function useCrossSection() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const followProfile = useAppSelector(selectProfile);
    const roadIds = useAppSelector(selectDrawRoadIds);
    const followFrom = useAppSelector(selectFollowCylindersFrom);
    const toFollow = useAppSelector(selectSelectedIds);
    const dispatch = useAppDispatch();

    const [objects, setObjects] = useState<AsyncState<RoadCrossSection[]>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        loadCrossSections();

        async function loadCrossSections() {
            if (measureScene === undefined) {
                return;
            }
            if (roadIds === undefined || followProfile.length === 0) {
                setObjects({ status: AsyncStatus.Success, data: [] });
                return;
            }
            setObjects({ status: AsyncStatus.Loading });

            try {
                const fp = await measureScene.getCrossSections(roadIds, Number(followProfile));

                if (!fp) {
                    setObjects({ status: AsyncStatus.Error, msg: "Cross section not found." });
                    return;
                }

                setObjects({ status: AsyncStatus.Success, data: fp });
            } catch (e) {
                setObjects({ status: AsyncStatus.Error, msg: "An error occurred." });
            }
        }
    }, [toFollow, measureScene, dispatch, followFrom, roadIds, followProfile]);

    return objects;
}
