import { useEffect } from "react";
import { Box, Button, FormControlLabel } from "@mui/material";
import { DeleteSweep, Undo } from "@mui/icons-material";

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

import { lineMeasureActions, selectlineMeasurePoints } from "./lineMeasureSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function LineMeasure() {
    const [menuOpen, toggleMenu] = useToggle();
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);

    const minimized = useAppSelector(selectMinimized) === featuresConfig.area.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.area.key;

    const selecting = useAppSelector(selectPicker) === Picker.LineMeasure;
    const points = useAppSelector(selectlineMeasurePoints);
    const dispatch = useAppDispatch();

    const lineStripValues = measureScene.measureLineStrip(points);
    dispatch(lineMeasureActions.setLength(lineStripValues.totalLength));

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.LineMeasure));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.lineMeasure}>
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
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.LineMeasure)
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(lineMeasureActions.undoPoint())}
                                color="grey"
                            >
                                <Undo sx={{ mr: 1 }} />
                                Undo
                            </Button>
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(lineMeasureActions.setPoints([]))}
                                color="grey"
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox flexDirection="column" display={menuOpen || minimized ? "none" : "flex"}>
                    {lineStripValues.totalLength > 0 ? (
                        <>
                            <Box p={1}>Total length: {lineStripValues.totalLength.toFixed(3)} m</Box>
                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>Segment lengths</AccordionSummary>
                                <AccordionDetails>
                                    {lineStripValues.segmentLengts.map((l) => (
                                        <Box p={1}>{l.toFixed(3)} m</Box>
                                    ))}
                                </AccordionDetails>
                            </Accordion>
                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>Angles between segments</AccordionSummary>
                                <AccordionDetails>
                                    {lineStripValues.angles.map((a) => (
                                        <Box p={1}>{(a * (180 / Math.PI)).toFixed(3)} °</Box>
                                    ))}
                                </AccordionDetails>
                            </Accordion>
                        </>
                    ) : null}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.lineMeasure.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.lineMeasure.key}-widget-menu-fab`}
            />
        </>
    );
}
