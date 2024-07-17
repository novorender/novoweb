import { DeleteSweep } from "@mui/icons-material";
import { Box, Button, FormControlLabel } from "@mui/material";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectClippingPlanes, selectPicker } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import Planes from "./planes";

export default function ClippingPlanes() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingPlanes.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.clippingPlanes.key);
    const selecting = useAppSelector(selectPicker) === Picker.ClippingPlane;
    const { planes, outlines } = useAppSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();
    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting) {
                dispatch(renderActions.setPicker(Picker.ClippingPlane));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.ClippingPlane));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.clippingPlanes}
                    disableShadow={menuOpen}
                >
                    {!menuOpen && !minimized ? (
                        <>
                            <Box mt={1} mb={1} display="flex" justifyContent="space-between">
                                <FormControlLabel
                                    sx={{ marginLeft: 0 }}
                                    control={
                                        <IosSwitch
                                            disabled={planes.length > 5}
                                            checked={selecting}
                                            color="primary"
                                            onChange={() =>
                                                dispatch(
                                                    renderActions.setPicker(
                                                        selecting ? Picker.Object : Picker.ClippingPlane
                                                    )
                                                )
                                            }
                                        />
                                    }
                                    label={<Box>Select</Box>}
                                />
                                <FormControlLabel
                                    sx={{ marginLeft: 0 }}
                                    control={
                                        <IosSwitch
                                            checked={outlines}
                                            color="primary"
                                            onChange={() =>
                                                dispatch(renderActions.setClippingPlanes({ outlines: !outlines }))
                                            }
                                        />
                                    }
                                    label={<Box>Outlines</Box>}
                                />
                                <Button
                                    onClick={() => {
                                        dispatch(renderActions.setClippingPlanes({ planes: [], enabled: false }));
                                    }}
                                    color="grey"
                                    disabled={!planes.length}
                                >
                                    <DeleteSweep sx={{ mr: 1 }} />
                                    Clear
                                </Button>
                            </Box>
                        </>
                    ) : null}
                </WidgetHeader>
                <ScrollBox p={1} pb={3} display={menuOpen || minimized ? "none" : "block"}>
                    <Planes />
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.clippingPlanes.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
