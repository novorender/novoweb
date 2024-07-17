import { MyLocation as MyLocationIcon } from "@mui/icons-material";
import { Box, Button, FormControlLabel } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    Divider,
    IosSwitch,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized, selectTmZoneForCalc } from "slices/explorer";

import {
    LocationStatus,
    myLocationActions,
    selectCurrentLocation,
    selectGeolocationPositionCoords,
    selectLocationStatus,
    selectMyLocationAutocenter,
    selectShowLocationMarker,
} from "./myLocationSlice";
import { useGoToMyLocation } from "./useGoToMyLocation";

export default function MyLocation() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.myLocation.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.myLocation.key);

    const tmZone = useAppSelector(selectTmZoneForCalc);
    const currentLocation = useAppSelector(selectCurrentLocation);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const autocenter = useAppSelector(selectMyLocationAutocenter);
    const geoLocationCoords = useAppSelector(selectGeolocationPositionCoords);
    const status = useAppSelector(selectLocationStatus);
    const dispatch = useAppDispatch();
    const goToPos = useGoToMyLocation();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.myLocation}
                    disableShadow={menuOpen}
                >
                    {!menuOpen && !minimized ? (
                        <Box mx={-1}>
                            <Button
                                sx={{ mr: 1 }}
                                disabled={!tmZone || status.status === LocationStatus.Loading}
                                onClick={goToPos}
                                color="grey"
                            >
                                <MyLocationIcon fontSize="small" sx={{ mr: 1 }} /> Go to
                            </Button>
                            <FormControlLabel
                                disabled={!tmZone}
                                control={
                                    <IosSwitch
                                        name="show location marker"
                                        size="medium"
                                        color="primary"
                                        checked={showMarker}
                                        onChange={(_e, checked) => {
                                            dispatch(myLocationActions.toggleShowMarker(checked));
                                            if (!checked) {
                                                dispatch(myLocationActions.toggleAutocenter(false));
                                            }
                                        }}
                                    />
                                }
                                label={<Box fontSize={14}>Marker</Box>}
                            />
                            <FormControlLabel
                                disabled={!tmZone}
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={autocenter}
                                        onChange={(_e, checked) => {
                                            dispatch(myLocationActions.toggleAutocenter(checked));
                                            if (checked) {
                                                dispatch(myLocationActions.toggleShowMarker(true));
                                            }
                                        }}
                                    />
                                }
                                label={<Box fontSize={14}>Center</Box>}
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
                    {status.status === LocationStatus.Error && (
                        <>
                            <Box>{status.msg}</Box>
                            <Divider sx={{ my: 1 }} />
                        </>
                    )}
                    {geoLocationCoords && (
                        <>
                            <Box mb={1}>Accuracy: {geoLocationCoords.accuracy}m</Box>
                            <Box mb={1}>Longitude: {geoLocationCoords.longitude}</Box>
                            <Box mb={1}>Latitude: {geoLocationCoords.latitude}</Box>
                            {geoLocationCoords.altitude && <Box mb={1}>Altitude: {geoLocationCoords.altitude}m</Box>}
                            {currentLocation && (
                                <Box mb={1}>Position: [{currentLocation.map((n) => Math.round(n)).join(", ")}]</Box>
                            )}
                        </>
                    )}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.myLocation.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
