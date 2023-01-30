import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";
import { CameraType, selectCameraType, selectProjectSettings } from "slices/renderSlice";

import { useFeedWebRawQuery } from "./api";
import { selectDitioProject, selectFilters, selectShowDitioMarkers } from "./slice";

const empty = [] as {
    position: vec3;
    id: string;
}[];

export function useDitioMarkers() {
    const filters = useAppSelector(selectFilters);
    const projId = useAppSelector(selectDitioProject)?.id ?? "";
    const { tmZone } = useAppSelector(selectProjectSettings);
    const showMarkers = useAppSelector(selectShowDitioMarkers);
    const cameraType = useAppSelector(selectCameraType);
    const { data: feed } = useFeedWebRawQuery({ projId, filters }, { skip: !projId });

    const [markers, setMarkers] = useState(empty);

    useEffect(() => {
        if (!feed || cameraType !== CameraType.Orthographic || !showMarkers || !tmZone) {
            setMarkers(empty);
            return;
        }

        setMarkers(
            feed
                .filter((post) => post.geoLocation)
                .slice(0, 100)
                .map(({ id, geoLocation }) => ({
                    id,
                    position: dataApi.latLon2tm({ longitude: geoLocation!.lon, latitude: geoLocation!.lat }, tmZone),
                })) ?? []
        );
    }, [showMarkers, feed, tmZone, cameraType]);

    return markers;
}
