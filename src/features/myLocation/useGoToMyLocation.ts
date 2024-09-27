import { vec3 } from "gl-matrix";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectCameraType } from "features/render";
import { latLon2Tm } from "features/render/utils";
import { selectTmZoneForCalc } from "slices/explorer";

import { LocationStatus, myLocationActions, selectCurrentLocation, selectShowLocationMarker } from "./myLocationSlice";

/**
 * Track current device location and zoom/fly to it.
 */
export function useGoToMyLocation() {
    const {
        state: { view, scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const tmZone = useAppSelector(selectTmZoneForCalc);
    const currentLocation = useAppSelector(selectCurrentLocation);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    return useCallback(() => {
        if (showMarker && currentLocation) {
            dispatch(
                renderActions.setCamera({
                    type: cameraType,
                    goTo: {
                        position: currentLocation,
                        rotation: view.renderState.camera.rotation,
                    },
                })
            );
            return;
        }

        dispatch(myLocationActions.setSatus({ status: LocationStatus.Loading }));
        navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 30000,
        });

        function handlePositionSuccess(geoPos: GeolocationPosition) {
            const position = latLon2Tm({ coords: geoPos.coords, tmZone: tmZone! });
            position[2] = geoPos.coords.altitude ?? view.renderState.camera.position[2];
            const outOfBounds =
                vec3.dist(position, scene.boundingSphere.center) >
                scene.boundingSphere.radius + geoPos.coords.accuracy * 2;

            if (outOfBounds) {
                dispatch(
                    myLocationActions.setSatus({
                        status: LocationStatus.Error,
                        msg: t("yourPositionIsOutsideSceneBoundaries"),
                    })
                );
            } else {
                dispatch(
                    renderActions.setCamera({
                        type: cameraType,
                        goTo: {
                            position,
                            rotation: view.renderState.camera.rotation,
                        },
                    })
                );
                dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
            }

            dispatch(
                myLocationActions.setGeolocationPositionCoords({
                    accuracy: geoPos.coords.accuracy,
                    altitude: geoPos.coords.altitude,
                    longitude: geoPos.coords.longitude,
                    latitude: geoPos.coords.latitude,
                })
            );
            dispatch(myLocationActions.setCurrentLocation(position));
        }

        function handlePositionError(error: GeolocationPositionError) {
            dispatch(myLocationActions.setGeolocationPositionCoords(undefined));
            dispatch(myLocationActions.setSatus({ status: LocationStatus.Error, msg: error.message }));
        }
    }, [dispatch, cameraType, currentLocation, scene.boundingSphere, showMarker, tmZone, view, t]);
}
