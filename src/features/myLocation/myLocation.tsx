import { Box, Button } from "@mui/material";
import { MyLocation as MyLocationIcon } from "@mui/icons-material";

import { dataApi } from "app";
import { LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { useMountedState } from "hooks/useMountedState";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppSelector } from "app/store";
import { selectProjectSettings } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

enum Status {
    Idle,
    Loading,
    Error,
}

type LocationStatus = { status: Status.Idle | Status.Loading } | { status: Status.Error; msg: string };

export function MyLocation() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.myLocation.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.myLocation.key;
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const { tmZone } = useAppSelector(selectProjectSettings);
    const [status, setStatus] = useMountedState({ status: Status.Idle } as LocationStatus);

    const goToPos = () => {
        setStatus({ status: Status.Loading });
        navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
            enableHighAccuracy: true,
        });

        function handlePositionSuccess(pos: GeolocationPosition) {
            const scenePos = dataApi.latLon2tm(pos.coords, tmZone);

            view.camera.controller.moveTo(
                [scenePos[0], pos.coords.altitude ?? view.camera.position[1], scenePos[2]],
                view.camera.rotation
            );

            setStatus({ status: Status.Idle });
        }

        function handlePositionError(error: GeolocationPositionError) {
            setStatus({ status: Status.Error, msg: error.message });
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.myLocation}>
                    {!menuOpen && !minimized ? (
                        <Box mx={-1}>
                            <Button disabled={!tmZone} onClick={goToPos} color="grey">
                                <MyLocationIcon fontSize="small" sx={{ mr: 1 }} /> Go to location
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box>{status.status === Status.Loading ? <LinearProgress /> : null}</Box>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    {!tmZone ? "Missing TM-zone. Admins can set this under Advanced settings -> Project" : null}
                    {status.status === Status.Error ? <Box>{status.msg}</Box> : null}
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
