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

    const updateProfile = useMemo(
        () =>
            debounce((bounds: [number, number]) => {
                dispatch(
                    deviationsActions.setSubprofileDeviationDistributions({
                        parameterBounds: bounds,
                        points: { status: AsyncStatus.Initial },
                    })
                );
            }, 500),
        [dispatch]
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
