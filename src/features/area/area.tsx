import { useEffect } from "react";
import { Box, Button, FormControlLabel } from "@mui/material";
import { DeleteSweep, Undo } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, ScrollBox, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { areaActions, selectArea, selectAreaPoints } from "./areaSlice";

export function Area() {
    const [menuOpen, toggleMenu] = useToggle();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.area.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.area.key;

    const selecting = useAppSelector(selectPicker) === Picker.Area;
    const points = useAppSelector(selectAreaPoints);
    const area = useAppSelector(selectArea);
    const dispatch = useAppDispatch();

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Area));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.area}>
                    <Box display="flex" justifyContent="space-between">
                        <FormControlLabel
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={selecting}
                                    onChange={() =>
                                        dispatch(renderActions.setPicker(selecting ? Picker.Object : Picker.Area))
                                    }
                                />
                            }
                            label={<Box fontSize={14}>Selecting</Box>}
                        />
                        <Button
                            disabled={!points.length}
                            onClick={() => dispatch(areaActions.undoPoint())}
                            color="grey"
                        >
                            <Undo sx={{ mr: 1 }} />
                            Undo
                        </Button>
                        <Button
                            disabled={!points.length}
                            onClick={() => dispatch(areaActions.setPoints([]))}
                            color="grey"
                        >
                            <DeleteSweep sx={{ mr: 1 }} />
                            Clear
                        </Button>
                    </Box>
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"}>
                    <Box p={1}>{area > 0 ? <>Area: {area.toFixed(3)} &#13217;</> : null}</Box>
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.area.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.area.key}-widget-menu-fab`} />
        </>
    );
}
