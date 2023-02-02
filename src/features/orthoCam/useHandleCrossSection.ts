import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { orthoCamActions } from "./orthoCamSlice";
import { CameraType, selectCameraType } from "slices/renderSlice";

export function useHandleCrossSection() {
    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (cameraType !== CameraType.Orthographic) {
            dispatch(orthoCamActions.setCrossSectionPoint(undefined));
            dispatch(orthoCamActions.setCrossSectionHover(undefined));
        }
    }, [cameraType, dispatch]);
}
