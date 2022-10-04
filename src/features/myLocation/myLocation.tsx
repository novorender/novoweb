import { Box, Button, FormControlLabel } from "@mui/material";
import { MyLocation as MyLocationIcon } from "@mui/icons-material";

import { dataApi } from "app";
import { IosSwitch, LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectProjectSettings } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { myLocationActions, selectShowLocationMarker, LocationStatus, selectLocationStatus } from "./myLocationSlice";

export function MyLocation() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.myLocation.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.myLocation.key;
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const { tmZone } = useAppSelector(selectProjectSettings);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const status = useAppSelector(selectLocationStatus);
    const dispatch = useAppDispatch();

    const goToPos = () => {
        dispatch(myLocationActions.setSatus({ status: LocationStatus.Loading }));
        navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
        });

        function handlePositionSuccess(pos: GeolocationPosition) {
            const scenePos = dataApi.latLon2tm(pos.coords, tmZone);

            view.camera.controller.moveTo(
                [scenePos[0], pos.coords.altitude ?? view.camera.position[1], scenePos[2]],
                view.camera.rotation
            );

            dispatch(myLocationActions.setSatus({ status: LocationStatus.Idle }));
        }

        function handlePositionError(error: GeolocationPositionError) {
            dispatch(myLocationActions.setSatus({ status: LocationStatus.Error, msg: error.message }));
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.myLocation}>
                    {!menuOpen && !minimized ? (
                        <Box mx={-1}>
                            <Button sx={{ mr: 1 }} disabled={!tmZone} onClick={goToPos} color="grey">
                                <MyLocationIcon fontSize="small" sx={{ mr: 1 }} /> Go to location
                            </Button>
                            <FormControlLabel
                                disabled={!tmZone}
                                control={
                                    <IosSwitch
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
                <Box>{status.status === LocationStatus.Loading ? <LinearProgress /> : null}</Box>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    {!tmZone ? "Missing TM-zone. Admins can set this under Advanced settings -> Project" : null}
                    {status.status === LocationStatus.Error ? <Box>{status.msg}</Box> : null}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.myLocation.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.myLocation.key}-widget-menu-fab`}
            />
        </>
    );
}
