import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";

import { selectDrawRoadIds, selectFollowCylindersFrom, selectProfile, selectSelectedIds } from "./followPathSlice";
import { RoadCrossSection } from "@novorender/api/types/measure";

export function useCrossSection() {
    const {
        state: { measureView },
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
            if (roadIds === undefined || followProfile.length === 0) {
                setObjects({ status: AsyncStatus.Success, data: [] });
                return;
            }
            setObjects({ status: AsyncStatus.Loading });

            try {
                const fp = await measureView?.road.getCrossSections(roadIds, Number(followProfile));

                if (!fp) {
                    setObjects({ status: AsyncStatus.Error, msg: "Cross section not found." });
                    return;
                }

                setObjects({ status: AsyncStatus.Success, data: fp });
            } catch (e) {
                setObjects({ status: AsyncStatus.Error, msg: "An error occurred." });
            }
        }
    }, [toFollow, measureView, dispatch, followFrom, roadIds, followProfile]);

    return objects;
}
