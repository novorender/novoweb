import { DeleteSweep } from "@mui/icons-material";
import { useRef, useEffect } from "react";
import { Box, Button, Checkbox, FormControlLabel } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { measureActions, selectMeasure } from "./measureSlice";
import { MeasuredObject, MeasuredResult } from "./measuredObject";

export function Measure() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.measure.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.measure.key;

    const dispatch = useAppDispatch();
    const { selecting, selected, forcePoint } = useAppSelector(selectMeasure);
    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !selected.length) {
                dispatch(measureActions.setSelecting(true));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, selected]);

    useEffect(() => {
        return () => {
            dispatch(measureActions.setSelecting(false));
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
                                        onChange={() => dispatch(measureActions.toggleSelecting())}
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
                            <Button onClick={() => dispatch(measureActions.clear())} color="grey" disabled={false}>
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
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
