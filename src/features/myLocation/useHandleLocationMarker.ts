import { vec3 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectProjectSettings } from "features/render";
import { latLon2Tm } from "features/render/utils";

import { LocationStatus, myLocationActions, selectShowLocationMarker } from "./myLocationSlice";

export function useHandleLocationMarker() {
    const {
        state: { view, scene },
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
                timeout: 30000,
            });

            function handlePositionSuccess(pos: GeolocationPosition) {
                if (!view || !scene) {
                    return;
                }

                const now = Date.now();

                if (now - lastUpdate.current < 5000) {
                    return;
                }

                const scenePos = latLon2Tm({ coords: pos.coords, tmZone });
                scenePos[2] = pos.coords.altitude ?? view.renderState.camera.position[2];
                const outOfBounds =
                    vec3.dist(scenePos, scene.boundingSphere.center) >
                    scene.boundingSphere.radius + pos.coords.accuracy * 2;

                if (outOfBounds) {
                    dispatch(
                        myLocationActions.setSatus({
                            status: LocationStatus.Error,
                            msg: "Your position is outside the scene's boundaries.",
                        })
                    );
                } else {
                    dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
                }

                lastUpdate.current = now;
                dispatch(myLocationActions.setCurrentLocation(scenePos));
                dispatch(
                    myLocationActions.setGeolocationPositionCoords({
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                        longitude: pos.coords.longitude,
                        latitude: pos.coords.latitude,
                    })
                );
            }

            function handlePositionError(error: GeolocationPositionError) {
                dispatch(myLocationActions.setGeolocationPositionCoords(undefined));
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Error, msg: error.message }));
            }
        } else {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            lastUpdate.current = 0;
            dispatch(myLocationActions.setCurrentLocation(undefined));
            dispatch(myLocationActions.setGeolocationPositionCoords(undefined));
            dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
        }
    }, [showMarker, view, scene, dispatch, tmZone]);

    useEffect(() => {
        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);
}
