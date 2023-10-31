import { MyLocation as MyLocationIcon } from "@mui/icons-material";
import { Box, Button, FormControlLabel } from "@mui/material";
import { vec3 } from "gl-matrix";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectCameraType, selectProjectSettings } from "features/render";
import { flip } from "features/render/utils";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";

import {
    LocationStatus,
    myLocationActions,
    selectCurrentLocation,
    selectLocationAccuracy,
    selectLocationStatus,
    selectShowLocationMarker,
} from "./myLocationSlice";

export default function MyLocation() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.myLocation.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.myLocation.key);
    const {
        state: { view, scene },
    } = useExplorerGlobals(true);

    const { tmZone } = useAppSelector(selectProjectSettings);
    const currentLocation = useAppSelector(selectCurrentLocation);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const accuracy = useAppSelector(selectLocationAccuracy);
    const status = useAppSelector(selectLocationStatus);
    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    const goToPos = () => {
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
            const isGlSpace = !vec3.equals(scene?.up ?? [0, 1, 0], [0, 0, 1]);
            const position = isGlSpace
                ? flip(dataApi.latLon2tm(geoPos.coords, tmZone))
                : dataApi.latLon2tm(geoPos.coords, tmZone);
            position[2] = geoPos.coords.altitude ?? view.renderState.camera.position[2];
            const outOfBounds =
                vec3.dist(position, scene.boundingSphere.center) >
                scene.boundingSphere.radius + geoPos.coords.accuracy * 2;

            if (outOfBounds) {
                dispatch(
                    myLocationActions.setSatus({
                        status: LocationStatus.Error,
                        msg: "Your position is outside the scene's boundaries.",
                    })
                );

                return;
            }

            dispatch(
                renderActions.setCamera({
                    type: cameraType,
                    goTo: {
                        position,
                        rotation: view.renderState.camera.rotation,
                    },
                })
            );

            dispatch(myLocationActions.setAccuracy(geoPos.coords.accuracy));
            dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
        }

        function handlePositionError(error: GeolocationPositionError) {
            dispatch(myLocationActions.setAccuracy(undefined));
            dispatch(myLocationActions.setSatus({ status: LocationStatus.Error, msg: error.message }));
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.myLocation} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <Box mx={-1}>
                            <Button
                                sx={{ mr: 1 }}
                                disabled={!tmZone || status.status === LocationStatus.Loading}
                                onClick={goToPos}
                                color="grey"
                            >
                                <MyLocationIcon fontSize="small" sx={{ mr: 1 }} /> Go to location
                            </Button>
                            <FormControlLabel
                                disabled={!tmZone}
                                control={
                                    <IosSwitch
                                        name="show location marker"
                                        size="medium"
                                        color="primary"
                                        checked={showMarker}
                                        onChange={(_e, checked) =>
                                            dispatch(myLocationActions.toggleShowMarker(checked))
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Show marker</Box>}
                            />
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box>
                    {status.status === LocationStatus.Loading ? (
                        <Box position="relative">
                            <LinearProgress />
                        </Box>
                    ) : null}
                </Box>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    {!tmZone ? "Missing TM-zone. Admins can set this under Advanced settings -> Project" : null}
                    {status.status === LocationStatus.Error ? (
                        <Box>{status.msg}</Box>
                    ) : accuracy !== undefined ? (
                        <Box>Accuracy: {accuracy}m</Box>
                    ) : null}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.myLocation.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
