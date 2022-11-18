import { DeleteSweep, PushPin } from "@mui/icons-material";
import { useRef, useEffect, useState } from "react";
import { Box, Button, capitalize, Checkbox, FormControlLabel, Grid, List, ListItem, Typography } from "@mui/material";
import { vec3 } from "gl-matrix";
import { MeasureEntity, MeasurementValues, MeasureSettings, PointEntity } from "@novorender/measure-api";

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
    MeasurementTable,
    VertexTable,
} from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { getMeasurementValueKind, MeasurementData } from "features/measure/measuredObject";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import {
    manholeActions,
    selectManholeMeasureValues,
    selectManholeId,
    selectIsLoadingManholeBrep,
    selectIsManholePinned,
    selectManholeMeasureAgainst,
    selectCollisionValues,
} from "./manholeSlice";

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
    const collisionValues = useAppSelector(selectCollisionValues);
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
            if (selectedMeasureEntity?.entity) {
                setMeasureValues(
                    await measureScene.measure(
                        selectedMeasureEntity.entity,
                        undefined,
                        selectedMeasureEntity.selected.settings
                    )
                );
            } else {
                setMeasureValues(undefined);
            }
        }
    }, [selectedMeasureEntity, measureScene]);

    const measureAgainstKind = !selectedMeasureEntity
        ? ""
        : measureValues
        ? getMeasurementValueKind(measureValues)
        : "point";

    const isVertex = (measureObject: MeasureEntity | undefined): measureObject is PointEntity => {
        return measureObject ? measureObject.drawKind === "vertex" : false;
    };

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
                                onClick={() => {
                                    dispatch(manholeActions.setPinned(false));
                                    dispatch(manholeActions.selectObj(undefined));
                                }}
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
                                        <Box component="span" sx={{ minWidth: 110 }} display="inline-block">
                                            Elevation top:
                                        </Box>
                                        {manhole.topElevation.toFixed(3)} m
                                    </Typography>
                                    <Typography>
                                        <Box component="span" sx={{ minWidth: 110 }} display="inline-block">
                                            Elevation bot:
                                        </Box>
                                        {manhole.bottomElevation.toFixed(3)} m
                                    </Typography>
                                    <Typography>
                                        <Box component="span" sx={{ minWidth: 110 }} display="inline-block">
                                            Radius outer:
                                        </Box>
                                        {manhole.outerRadius.toFixed(3)} m
                                    </Typography>
                                    {manhole.innerRadius ? (
                                        <Typography>
                                            <Box component="span" sx={{ minWidth: 110 }} display="inline-block">
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
                                            useCylinderMeasureSettings={false}
                                            setSettingsFunc={(settings: MeasureSettings) => {
                                                dispatch(manholeActions.setMeasureAgainstSettings(settings));
                                            }}
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
                                            useCylinderMeasureSettings={false}
                                            setSettingsFunc={(settings: MeasureSettings) => {
                                                dispatch(manholeActions.setMeasureAgainstSettings(settings));
                                            }}
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
                                            simpleCylinder={true}
                                            useCylinderMeasureSettings={false}
                                            setSettingsFunc={(settings: MeasureSettings) => {
                                                dispatch(manholeActions.setMeasureAgainstSettings(settings));
                                            }}
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
                                                useCylinderMeasureSettings={false}
                                                simpleCylinder={true}
                                                setSettingsFunc={(settings: MeasureSettings) => {
                                                    dispatch(manholeActions.setMeasureAgainstSettings(settings));
                                                }}
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
                    {selectedMeasureEntity ? (
                        <>
                            <Accordion defaultExpanded={false}>
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
                                            settings={selectedMeasureEntity.selected.settings}
                                            useCylinderMeasureSettings={false}
                                            setSettingsFunc={(settings: MeasureSettings) => {
                                                dispatch(manholeActions.setMeasureAgainstSettings(settings));
                                            }}
                                        />
                                    ) : isVertex(selectedMeasureEntity.entity) ? (
                                        <Box p={2}>
                                            <VertexTable vertices={[selectedMeasureEntity.entity.parameter]} />
                                        </Box>
                                    ) : null}
                                </AccordionDetails>
                            </Accordion>
                        </>
                    ) : null}
                    {collisionValues ? (
                        <>
                            <List>
                                <ListItem>
                                    <Grid container>
                                        <Grid item xs={4}>
                                            Distance from manhole bottom
                                        </Grid>
                                        <Grid item xs={6}>
                                            {vec3.distance(collisionValues[0], collisionValues[1]).toFixed(3)} m
                                        </Grid>
                                    </Grid>
                                </ListItem>
                            </List>
                            <Box p={1}>
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>Components</AccordionSummary>
                                    <AccordionDetails>
                                        {<MeasurementTable start={collisionValues[0]} end={collisionValues[1]} />}
                                    </AccordionDetails>
                                </Accordion>
                            </Box>
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
