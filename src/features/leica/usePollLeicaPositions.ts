import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectProjectSettings } from "slices/renderSlice";

import { leicaActions, selectProjectId, selectShowLeicaMarkers } from "./leicaSlice";
import { useAllUnitsQuery } from "./leicaApi";
import { dataApi } from "app";

export function usePollLeicaPositions() {
    const showMarkers = useAppSelector(selectShowLeicaMarkers);
    const projectId = useAppSelector(selectProjectId);
    const { tmZone } = useAppSelector(selectProjectSettings);
    const dispatch = useAppDispatch();

    const { data: units } = useAllUnitsQuery(projectId, {
        pollingInterval: 20 * 1000,
        skip: !projectId || !showMarkers,
    });

    useEffect(() => {
        if (units) {
            dispatch(
                leicaActions.setMarkers(
                    units
                        ?.filter((unit) => unit.location)
                        .map((unit) => {
                            const position = dataApi.latLon2tm(
                                {
                                    latitude: unit.location!.lat,
                                    longitude: unit.location!.lon,
                                },
                                tmZone
                            );

                            position[1] = unit.location!.altitude;

                            return { position, id: unit.uuid, online: unit.metadata.is_online };
                        })
                )
            );
        }
    }, [units, dispatch, tmZone]);
}
