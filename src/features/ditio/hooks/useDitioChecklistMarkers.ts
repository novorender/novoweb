import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppSelector } from "app/store";
import { selectIsTopDown } from "features/orthoCam";
import { CameraType, selectCameraType, selectProjectSettings } from "features/render";
import { latLon2Tm } from "features/render/utils";
import { AsyncStatus } from "types/misc";

import { useGetChecklistItemsQuery, useGetChecklistsQuery } from "../api";
import {
    selectDitioAccessToken,
    selectDitioProjects,
    selectFilters,
    selectShowDitioChecklistInitialized,
    selectShowDitioChecklistMarkers,
} from "../slice";
import { Checklist } from "../types";

const empty = [] as (Checklist & { position: vec3 })[];

export function useDitioChecklistMarkers() {
    const filters = useAppSelector(selectFilters);
    const projects = useAppSelector(selectDitioProjects);
    const { tmZone } = useAppSelector(selectProjectSettings);
    const showMarkers = useAppSelector(selectShowDitioChecklistMarkers);
    const cameraType = useAppSelector(selectCameraType);
    const token = useAppSelector(selectDitioAccessToken);
    const isInitialized = useAppSelector(selectShowDitioChecklistInitialized);

    const { data: checklistItemsMeta } = useGetChecklistItemsQuery(
        { projects, filters },
        { skip: !projects.length || token.status !== AsyncStatus.Success || !isInitialized }
    );
    const { data: checklists, isFetching: isFetchingChecklists } = useGetChecklistsQuery(
        { ids: (checklistItemsMeta ?? []).map((item) => item.Id) },
        { skip: !checklistItemsMeta?.length }
    );

    const isTopDown = useAppSelector(selectIsTopDown);

    const [markers, setMarkers] = useState(empty);

    const disabled = cameraType !== CameraType.Orthographic || !isTopDown || !showMarkers || !tmZone;

    useEffect(() => {
        if (!checklists?.length || disabled) {
            setMarkers(empty);
            return;
        }

        const markers = checklists
            .filter((checklist) => checklist.longitude && checklist.latitude)
            .slice(0, 100)
            .map((checklist) => ({
                ...checklist,
                position: latLon2Tm({
                    coords: { longitude: checklist.longitude, latitude: checklist.latitude },
                    tmZone,
                }),
            }));

        setMarkers(markers);
    }, [checklists, disabled, tmZone]);

    return isFetchingChecklists ? empty : markers;
}
