import { DeleteSweep } from "@mui/icons-material";
import { Box, Button, FormControlLabel } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactVirtualizedAutoSizer from "react-virtualized-auto-sizer";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectClippingPlanes, selectPicker } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { Clipping2d } from "./clipping2d";

export default function CrossSection() {
    const { t } = useTranslation();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.crossSection.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.crossSection.key);
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
                    widget={featuresConfig.crossSection}
                    disableShadow={menuOpen}
                ></WidgetHeader>
                <Box sx={{ width: "100%", height: "100%" }}>
                    <ReactVirtualizedAutoSizer>
                        {({ width, height }) => <Clipping2d width={width} height={height} />}
                    </ReactVirtualizedAutoSizer>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.crossSection.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
