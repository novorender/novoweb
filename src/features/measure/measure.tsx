import { DeleteSweep } from "@mui/icons-material";
import { useRef, useEffect } from "react";
import { Box, Button, Checkbox, FormControlLabel } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";

import { measureActions, selectMeasure } from "./measureSlice";
import { MeasuredObject, MeasuredResult } from "./measuredObject";

export function Measure() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.measure.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.measure.key;

    const dispatch = useAppDispatch();
    const { selected, forcePoint, loadingBrep } = useAppSelector(selectMeasure);
    const selecting = useAppSelector(selectPicker) === Picker.Measurement;
    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !selected.length) {
                dispatch(renderActions.setPicker(Picker.Measurement));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, selected]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Measurement));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.measure}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.Measurement)
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="medium"
                                        color="primary"
                                        checked={forcePoint}
                                        onChange={() => dispatch(measureActions.toggleForcePoint())}
                                    />
                                }
                                label={<Box fontSize={14}>Force points</Box>}
                            />
                            <Button
                                onClick={() => dispatch(measureActions.clear())}
                                color="grey"
                                disabled={!selected.length}
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                {loadingBrep ? (
                    <Box>
                        <LinearProgress />
                    </Box>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    {selected.map((obj, idx) => (
                        <MeasuredObject obj={obj} idx={idx} key={idx} />
                    ))}
                    <MeasuredResult />
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.measure.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.measure.key}-widget-menu-fab`}
            />
        </>
    );
}
