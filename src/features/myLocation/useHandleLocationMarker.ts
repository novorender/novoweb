import { useEffect, useRef } from "react";
import { vec3 } from "gl-matrix";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectProjectSettings } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { LocationStatus, myLocationActions, selectShowLocationMarker } from "./myLocationSlice";

export function useHandleLocationMarker() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const { tmZone } = useAppSelector(selectProjectSettings);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const dispatch = useAppDispatch();
    const watchId = useRef<number>();
    const lastUpdate = useRef(0);

    useEffect(() => {
        if (showMarker && tmZone) {
            if (watchId.current) {
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
                navigator.geolocation.clearWatch(watchId.current);
            }

            dispatch(myLocationActions.setSatus({ status: LocationStatus.Loading }));
            watchId.current = navigator.geolocation.watchPosition(handlePositionSuccess, handlePositionError, {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            });

            function handlePositionSuccess(pos: GeolocationPosition) {
                if (!view) {
                    return;
                }

                const now = Date.now();

                if (now - lastUpdate.current < 5000) {
                    return;
                }

                lastUpdate.current = now;
                const scenePos = dataApi.latLon2tm(pos.coords, tmZone);

                dispatch(
                    myLocationActions.setCurrentLocation(
                        vec3.fromValues(scenePos[0], pos.coords.altitude ?? view.camera.position[1], scenePos[2])
                    )
                );
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
            }

            function handlePositionError(error: GeolocationPositionError) {
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Error, msg: error.message }));
            }
        } else {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            lastUpdate.current = 0;
            dispatch(myLocationActions.setCurrentLocation(undefined));
        }
    }, [showMarker, view, dispatch, tmZone]);

    useEffect(() => {
        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);
}
