import { DeleteSweep } from "@mui/icons-material";
import { useRef, useEffect } from "react";
import { Box, Button, FormControlLabel } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    IosSwitch,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { MeasurementData } from "features/measure/measuredObject";

import { manholeActions, selectManhole, selectManholeId } from "./manholeSlice";

export function Manhole() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.measure.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.measure.key;

    const dispatch = useAppDispatch();
    const manhole = useAppSelector(selectManhole);
    const manholeId = useAppSelector(selectManholeId);
    const selecting = useAppSelector(selectPicker) === Picker.Manhole;
    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting) {
                dispatch(renderActions.setPicker(Picker.Manhole));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Manhole));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.manhole}>
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
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.Manhole)
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <Button
                                color="grey"
                                disabled={manhole === undefined}
                                onClick={() => dispatch(manholeActions.setManholeValues(undefined))}
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    {manhole ? (
                        <>
                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>
                                    <Box width={0} flex="1 1 auto" overflow="hidden">
                                        <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                            Top - Elevation: {manhole.topElevation.toFixed(3)} m
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <MeasurementData
                                        settings={undefined}
                                        measureValues={manhole.top}
                                        idx={0}
                                        useCylinderMeasureSettings={false}
                                    />
                                </AccordionDetails>
                            </Accordion>

                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>
                                    <Box width={0} flex="1 1 auto" overflow="hidden">
                                        <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                            Bottom - Elevation: {manhole.bottomElevation.toFixed(3)} m
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <MeasurementData
                                        settings={undefined}
                                        measureValues={manhole.bottom}
                                        idx={1}
                                        useCylinderMeasureSettings={false}
                                    />
                                </AccordionDetails>
                            </Accordion>

                            <Accordion defaultExpanded={false}>
                                <AccordionSummary>
                                    <Box width={0} flex="1 1 auto" overflow="hidden">
                                        <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                            {`${
                                                manhole.inner ? "Outer - Radius" : "Radius"
                                            }: ${manhole.outerRadius.toFixed(3)}`}{" "}
                                            m
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <MeasurementData
                                        settings={undefined}
                                        measureValues={manhole.outer}
                                        idx={2}
                                        simpleCylinder={true}
                                        useCylinderMeasureSettings={false}
                                    />
                                </AccordionDetails>
                            </Accordion>
                            {manhole.inner && manhole.innerRadius ? (
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                Inner - Radius: {manhole.innerRadius.toFixed(3)} m
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <MeasurementData
                                            settings={undefined}
                                            measureValues={manhole.inner}
                                            idx={3}
                                            useCylinderMeasureSettings={false}
                                            simpleCylinder={true}
                                        />
                                    </AccordionDetails>
                                </Accordion>
                            ) : null}
                        </>
                    ) : (
                        <Box p={1}>
                            {manholeId !== undefined
                                ? `Object with ID ${manholeId} is not a manhole.`
                                : "No object selected."}
                        </Box>
                    )}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.manhole.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.manhole.key}-widget-menu-fab`}
            />
        </>
    );
}
