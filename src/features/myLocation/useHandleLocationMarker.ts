import { useEffect, useRef } from "react";
import { vec3 } from "gl-matrix";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectProjectSettings } from "features/render/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { LocationStatus, myLocationActions, selectShowLocationMarker } from "./myLocationSlice";

export function useHandleLocationMarker() {
    const {
        state: { view_OLD: view, scene_OLD: scene },
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

                const scenePos = dataApi.latLon2tm(pos.coords, tmZone);
                const outOfBounds = vec3.dist(scenePos, scene.boundingSphere.center) > scene.boundingSphere.radius;

                if (outOfBounds) {
                    dispatch(
                        myLocationActions.setSatus({
                            status: LocationStatus.Error,
                            msg: "Your position is outside the scene's boundaries.",
                        })
                    );

                    return;
                }

                lastUpdate.current = now;
                dispatch(
                    myLocationActions.setCurrentLocation(
                        vec3.fromValues(scenePos[0], pos.coords.altitude ?? view.camera.position[1], scenePos[2])
                    )
                );
                dispatch(myLocationActions.setAccuracy(pos.coords.accuracy));
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
            }

            function handlePositionError(error: GeolocationPositionError) {
                dispatch(myLocationActions.setAccuracy(undefined));
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Error, msg: error.message }));
            }
        } else {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            lastUpdate.current = 0;
            dispatch(myLocationActions.setCurrentLocation(undefined));
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
