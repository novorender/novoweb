import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectDeviations } from "features/render";
import { AsyncStatus } from "types/misc";
import { getAssetUrl } from "utils/misc";

import { deviationsActions, selectDeviationProfiles } from "./deviationsSlice";

type DeviationConfig = {
    pointToTriangle: {
        groups: {
            name: string;
            groupIds: string[];
        }[];
    };
    pointToPoint: {
        groups: {
            name: "Point to point";
            from: {
                groupIds: string[];
            };
            to: {
                groupIds: string[];
            };
        }[];
    };
};

export function useHandleDeviations() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const deviation = useAppSelector(selectDeviations);
    const profiles = useAppSelector(selectDeviationProfiles);
    const dispatch = useAppDispatch();

    useEffect(() => {
        initDeviationProfiles();

        async function initDeviationProfiles() {
            if (!view || profiles.status !== AsyncStatus.Initial) {
                return;
            }

            const url = getAssetUrl(view, "deviations.json").toString();

            dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Loading }));

            try {
                const res = (await fetch(url).then((res) => {
                    if (!res.ok) {
                        return {
                            pointToTriangle: {
                                groups: [],
                            },
                            pointToPoint: {
                                groups: [],
                            },
                        };
                    }

                    return res.json();
                })) as DeviationConfig;

                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Success,
                        data: [
                            ...(res.pointToTriangle ? res.pointToTriangle.groups.map((grp) => grp.name) : []),
                            ...(res.pointToPoint ? res.pointToPoint.groups.map((grp) => grp.name) : []),
                        ],
                    })
                );
            } catch (e) {
                console.warn(e);
                dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Success, data: [] }));
            }
        }
    }, [view, dispatch, profiles]);

    useEffect(
        function handleDeviationChanges() {
            if (deviation.index > 0 && profiles.status === AsyncStatus.Success && profiles.data.length < 2) {
                dispatch(
                    renderActions.setPoints({
                        deviation: {
                            index: 0,
                        },
                    })
                );
            }
        },
        [profiles, deviation, dispatch]
    );

    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            view.modifyRenderState({ points: { deviation } });
        },
        [view, deviation]
    );
}
