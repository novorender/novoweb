import { debounce } from "@mui/material";
import { useEffect, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectViewMode } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { selectRangeFollowsCamera, selectSelectedSubprofile, selectVisibleTopDownProfile } from "../selectors";
import { useIsTopDownOrthoCamera } from "./useIsTopDownOrthoCamera";

export function useTrackVisibleTopDownProfile() {
    const isTopDown = useIsTopDownOrthoCamera();
    const active = useAppSelector(selectViewMode) === ViewMode.Deviations;
    const visibleTopDownProfile = useAppSelector(selectVisibleTopDownProfile);
    const rangeFollowsCamera = useAppSelector(selectRangeFollowsCamera);
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const dispatch = useAppDispatch();
    const parameterBounds = subprofile?.centerLine?.parameterBounds;

    const updateProfile = useMemo(
        () =>
            debounce((bounds: [number, number]) => {
                if (!parameterBounds) {
                    return;
                }
                let min = Math.max(bounds[0], parameterBounds[0]);
                let max = Math.min(bounds[1], parameterBounds[1]);
                if (max < min + 1) {
                    [min, max] = parameterBounds;
                }

                dispatch(
                    deviationsActions.setSubprofileDeviationDistributions({
                        parameterBounds: [min, max],
                        data: { status: AsyncStatus.Initial },
                    })
                );
            }, 500),
        [dispatch, parameterBounds]
    );

    useEffect(() => {
        if (!isTopDown || !active || !visibleTopDownProfile || !subprofile?.centerLine || !rangeFollowsCamera) {
            return;
        }

        if (visibleTopDownProfile) {
            updateProfile(visibleTopDownProfile);
        }
    }, [isTopDown, active, visibleTopDownProfile, subprofile, updateProfile, rangeFollowsCamera]);
}
