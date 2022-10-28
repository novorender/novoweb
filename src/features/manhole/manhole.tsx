import { DeleteSweep, PushPin } from "@mui/icons-material";
import { useRef, useEffect, useState } from "react";
import { Box, Button, capitalize, Checkbox, FormControlLabel, Typography } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    IosSwitch,
    LinearProgress,
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
import { getMeasurementValueKind, MeasuredResult, MeasurementData } from "features/measure/measuredObject";

import {
    manholeActions,
    selectManholeMeasureValues,
    selectManholeId,
    selectIsLoadingManholeBrep,
    selectIsManholePinned,
    selectManholeMeasureAgainst,
    selectManholeDuoMeasure,
} from "./manholeSlice";
import { VertexTable } from "features/measure/tables";
import { MeasureEntity, MeasurementValues, PointEntity } from "@novorender/measure-api";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useManholeMeasure } from "./useHandleManholeUpdates";

export function Manhole() {
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.manhole.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.manhole.key;

    const dispatch = useAppDispatch();
    const manhole = useAppSelector(selectManholeMeasureValues);

    const selectedObj = useAppSelector(selectManholeId);
    const selectedMeasureEntity = useAppSelector(selectManholeMeasureAgainst);
    const selectedMeasureObject = useManholeMeasure();
    const duoMeasurementValues = useAppSelector(selectManholeDuoMeasure);
    const isLoading = useAppSelector(selectIsLoadingManholeBrep);
    const isPinned = useAppSelector(selectIsManholePinned);
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

    const [measureValues, setMeasureValues] = useState<MeasurementValues>();
    useEffect(() => {
        getMeasureValues();

        async function getMeasureValues() {
            if (selectedMeasureObject) {
                setMeasureValues(
                    await measureScene.measure(selectedMeasureObject, undefined, selectedMeasureObject.settings)
                );
            } else {
                setMeasureValues(undefined);
            }
        }
    }, [selectedMeasureObject, measureScene]);

    const measureAgainstKind = !selectedMeasureEntity
        ? ""
        : measureValues
        ? getMeasurementValueKind(measureValues)
        : "point";

    const isVertex = (measureObject: MeasureEntity | undefined): measureObject is PointEntity => {
        return measureObject ? measureObject.drawKind === "vertex" : false;
    };

    const useCylinderMeasureSettings =
        duoMeasurementValues &&
        (!duoMeasurementValues.validMeasureSettings || duoMeasurementValues.validMeasureSettings.a);

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
                                disabled={selectedObj === undefined}
                                onClick={() => dispatch(manholeActions.selectObj(undefined))}
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                {isLoading ? (
                    <Box>
                        <LinearProgress />
                    </Box>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "block"} pb={3}>
                    {manhole ? (
                        <Accordion defaultExpanded={true}>
                            <AccordionSummary>
                                Manhole
                                <Box flex="0 0 auto">
                                    <Checkbox
                                        aria-label="pin measured object"
                                        sx={{ mr: 1, p: 0 }}
                                        size="small"
                                        icon={<PushPin color="disabled" />}
                                        checkedIcon={<PushPin color="primary" />}
                                        onChange={() => {
                                            dispatch(manholeActions.setPinned(!isPinned));
                                        }}
                                        checked={isPinned}
                                        onClick={(event) => event.stopPropagation()}
                                        onFocus={(event) => event.stopPropagation()}
                                    />
                                </Box>
                            </AccordionSummary>

                            <AccordionDetails>
                                <Box p={1}>
                                    <Typography>
                                        <Box sx={{ minWidth: 110 }} display="inline-block">
                                            Elevation top:
                                        </Box>
                                        {manhole.topElevation.toFixed(3)} m
                                    </Typography>
                                    <Typography>
                                        <Box sx={{ minWidth: 110 }} display="inline-block">
                                            Elevation bot:
                                        </Box>
                                        {manhole.bottomElevation.toFixed(3)} m
                                    </Typography>
                                    <Typography>
                                        <Box sx={{ minWidth: 110 }} display="inline-block">
                                            Radius outer:
                                        </Box>
                                        {manhole.outerRadius.toFixed(3)} m
                                    </Typography>
                                    {manhole.innerRadius ? (
                                        <Typography>
                                            <Box sx={{ minWidth: 110 }} display="inline-block">
                                                Radius inner:
                                            </Box>
                                            {manhole.innerRadius.toFixed(3)} m
                                        </Typography>
                                    ) : null}
                                </Box>
                                <Divider />
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                Top
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ mx: -1 }}>
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
                                                Bottom
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ mx: -1 }}>
                                        <MeasurementData
                                            settings={undefined}
                                            measureValues={manhole.bottom}
                                            idx={1}
                                            useCylinderMeasureSettings={
                                                useCylinderMeasureSettings ? useCylinderMeasureSettings : false
                                            }
                                        />
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                Outer
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ mx: -1 }}>
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
                                                    Inner
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ mx: -1 }}>
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
                            </AccordionDetails>
                        </Accordion>
                    ) : !isLoading ? (
                        <Box p={1}>
                            {selectedObj !== undefined
                                ? `Object with ID ${selectedObj} is not a manhole.`
                                : "No object selected."}
                        </Box>
                    ) : null}
                    {selectedMeasureObject ? (
                        <>
                            <Accordion defaultExpanded={true}>
                                <AccordionSummary>
                                    <Box width={0} flex="1 1 auto" overflow="hidden">
                                        <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                            {measureAgainstKind
                                                ? measureAgainstKind === "lineStrip"
                                                    ? "Line strip"
                                                    : capitalize(measureAgainstKind)
                                                : "Loading..."}
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {!selectedMeasureEntity ? null : measureValues ? (
                                        <MeasurementData
                                            measureValues={measureValues}
                                            settings={selectedMeasureEntity.settings}
                                            useCylinderMeasureSettings={false}
                                            idx={0}
                                        />
                                    ) : isVertex(selectedMeasureObject) ? (
                                        <Box p={2}>
                                            <VertexTable vertices={[selectedMeasureObject.parameter]} />
                                        </Box>
                                    ) : null}
                                </AccordionDetails>
                            </Accordion>
                            <MeasuredResult duoMeasurementValues={duoMeasurementValues} />
                        </>
                    ) : null}
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
