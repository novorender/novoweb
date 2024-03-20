import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { CameraType, renderActions, selectCameraType, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";

import { orthoCamActions } from "./orthoCamSlice";

export function useHandleCrossSection() {
    const cameraType = useAppSelector(selectCameraType);
    const viewMode = useAppSelector(selectViewMode);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (cameraType !== CameraType.Orthographic) {
            dispatch(orthoCamActions.setCrossSectionPoint(undefined));
            dispatch(orthoCamActions.setCrossSectionHover(undefined));
            if (viewMode === ViewMode.CrossSection) {
                dispatch(renderActions.setViewMode(ViewMode.Default));
            }
        }
    }, [cameraType, dispatch, viewMode]);
}
