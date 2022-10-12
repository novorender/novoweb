import { useEffect, useRef, useState } from "react";
import { Box, Button, FormControlLabel } from "@mui/material";
import { DeleteSweep, Undo } from "@mui/icons-material";
import { LineStripMeasureValues } from "@novorender/measure-api";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    IosSwitch,
    ScrollBox,
    LogoSpeedDial,
    WidgetContainer,
    WidgetHeader,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { pointLineActions, selectPointLinePoints } from "./pointLineSlice";

export function PointLine() {
    const [menuOpen, toggleMenu] = useToggle();
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);

    const minimized = useAppSelector(selectMinimized) === featuresConfig.area.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.area.key;

    const selecting = useAppSelector(selectPicker) === Picker.PointLine;
    const points = useAppSelector(selectPointLinePoints);
    const dispatch = useAppDispatch();
    const [measurement, setMeasurement] = useState<LineStripMeasureValues>();

    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !points.length) {
                dispatch(renderActions.setPicker(Picker.PointLine));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, points]);

    useEffect(() => {
        const val = measureScene.measureLineStrip(points);
        setMeasurement(val);
        dispatch(pointLineActions.setLength(val.totalLength));
    }, [points, dispatch, measureScene]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.PointLine));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.pointLine}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.PointLine)
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(pointLineActions.undoPoint())}
                                color="grey"
                            >
                                <Undo sx={{ mr: 1 }} />
                                Undo
                            </Button>
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(pointLineActions.setPoints([]))}
                                color="grey"
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox flexDirection="column" display={menuOpen || minimized ? "none" : "flex"}>
                    {measurement && measurement.totalLength > 0 ? (
                        <>
                            <Box p={1}>Total length: {measurement.totalLength.toFixed(3)} m</Box>
                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>Segment lengths</AccordionSummary>
                                <AccordionDetails>
                                    {measurement.segmentLengts.map((l, idx) => (
                                        <Box key={idx} p={1}>
                                            {l.toFixed(3)} m
                                        </Box>
                                    ))}
                                </AccordionDetails>
                            </Accordion>
                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>Angles between segments</AccordionSummary>
                                <AccordionDetails>
                                    {measurement.angles.map((a, idx) => (
                                        <Box key={idx} p={1}>
                                            {(a * (180 / Math.PI)).toFixed(3)} °
                                        </Box>
                                    ))}
                                </AccordionDetails>
                            </Accordion>
                        </>
                    ) : null}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.pointLine.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.pointLine.key}-widget-menu-fab`}
            />
        </>
    );
}
