import { ReadonlyVec3, vec3 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { latLon2Tm } from "features/render/utils";
import { selectTmZoneForCalc } from "slices/explorer";

import {
    LocationStatus,
    myLocationActions,
    selectMyLocationAutocenter,
    selectShowLocationMarker,
} from "./myLocationSlice";
import { useGoToLocation } from "./useGoToLocation";

export function useHandleLocationMarker() {
    const {
        state: { view, scene },
    } = useExplorerGlobals();

    const tmZone = useAppSelector(selectTmZoneForCalc);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const autocenter = useAppSelector(selectMyLocationAutocenter);
    const autocenterRef = useRef(autocenter);
    autocenterRef.current = autocenter;
    const dispatch = useAppDispatch();
    const watchId = useRef<number>();
    const lastUpdate = useRef(0);
    const lastAltitude = useRef<number>();
    const goToLocation = useGoToLocation();
    const goToLocationRef = useRef(goToLocation);
    goToLocationRef.current = goToLocation;
    const lastScenePos = useRef<ReadonlyVec3>();

    useEffect(() => {
        if (autocenter && lastScenePos.current && goToLocationRef.current) {
            goToLocationRef.current(lastScenePos.current);
        }
    }, [autocenter]);

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
                if (!view || !scene || !tmZone) {
                    return;
                }

                const now = Date.now();

                if (now - lastUpdate.current < 500) {
                    return;
                }

                const scenePos = latLon2Tm({ coords: pos.coords, tmZone });
                if (pos.coords.altitude) {
                    lastAltitude.current = pos.coords.altitude;
                } else if (!lastAltitude.current) {
                    lastAltitude.current = view.renderState.camera.position[2];
                }
                scenePos[2] = lastAltitude.current;
                lastScenePos.current = scenePos;
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

                    if (autocenterRef.current) {
                        goToLocation(scenePos);
                    }
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
            lastAltitude.current = undefined;
            lastScenePos.current = undefined;
            dispatch(myLocationActions.setCurrentLocation(undefined));
            dispatch(myLocationActions.setGeolocationPositionCoords(undefined));
            dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
        }
    }, [showMarker, view, scene, dispatch, tmZone, goToLocation]);

    useEffect(() => {
        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);
}
