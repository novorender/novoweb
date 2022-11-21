import { DeleteSweep, PushPin } from "@mui/icons-material";
import { useRef, useEffect, useState } from "react";
import { Box, Button, capitalize, Checkbox, FormControlLabel, Grid } from "@mui/material";
import { vec3 } from "gl-matrix";
import { MeasurementValues } from "@novorender/measure-api";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    IosSwitch,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
    VertexTable,
} from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { MeasurementData } from "features/measure/measuredObject";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { measureObjectIsVertex, getMeasurementValueKind } from "utils/misc";

import {
    manholeActions,
    selectManholeMeasureValues,
    selectManholeId,
    selectIsLoadingManholeBrep,
    selectIsManholePinned,
    selectManholeCollisionTarget,
    selectManholeCollisionValues,
    selectManholeCollisionSettings,
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
    const collisionTarget = useAppSelector(selectManholeCollisionTarget);
    const collisionValues = useAppSelector(selectManholeCollisionValues);
    const collisionSettings = useAppSelector(selectManholeCollisionSettings);
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
            if (collisionTarget?.entity) {
                setMeasureValues(await measureScene.measure(collisionTarget.entity, undefined, collisionSettings));
            } else {
                setMeasureValues(undefined);
            }
        }
    }, [collisionTarget, collisionSettings, measureScene]);

    const collisionTargetKind = !collisionTarget
        ? ""
        : measureValues
        ? getMeasurementValueKind(measureValues)
        : "point";

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
                                Manhole
                            </AccordionSummary>

                            <AccordionDetails>
                                <Box p={1}>
                                    <Grid container>
                                        <Grid item xs={5}>
                                            Elevation top:
                                        </Grid>
                                        <Grid item xs={5}>
                                            {manhole.topElevation.toFixed(3)} m
                                        </Grid>

                                        <Grid item xs={5}>
                                            Elevation bot:
                                        </Grid>
                                        <Grid item xs={5}>
                                            {manhole.bottomElevation.toFixed(3)} m
                                        </Grid>

                                        <Grid item xs={5}>
                                            Elevation inner bot:
                                        </Grid>
                                        <Grid item xs={5}>
                                            {manhole.bottomElevation.toFixed(3)} m todo
                                        </Grid>

                                        <Grid item xs={5}>
                                            Diameter outer:{" "}
                                        </Grid>
                                        <Grid item xs={5}>
                                            {(manhole.outerRadius * 2).toFixed(3)} m
                                        </Grid>

                                        {manhole.innerRadius && (
                                            <>
                                                <Grid item xs={5}>
                                                    Diameter inner:
                                                </Grid>
                                                <Grid item xs={5}>
                                                    {(manhole.innerRadius * 2).toFixed(3)} m
                                                </Grid>
                                            </>
                                        )}
                                    </Grid>
                                </Box>
                                <Accordion defaultExpanded={false} level={2}>
                                    <AccordionSummary level={2}>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                Top
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ mx: -1 }}>
                                        <MeasurementData measureValues={manhole.top} />
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion defaultExpanded={false} level={2}>
                                    <AccordionSummary level={2}>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                Bottom
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ mx: -1 }}>
                                        <MeasurementData measureValues={manhole.bottom} />
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion defaultExpanded={false} level={2}>
                                    <AccordionSummary level={2}>
                                        <Box width={0} flex="1 1 auto" overflow="hidden">
                                            <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                Outer
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ mx: -1 }}>
                                        <MeasurementData measureValues={manhole.outer} />
                                    </AccordionDetails>
                                </Accordion>
                                {manhole.inner && manhole.innerRadius ? (
                                    <Accordion defaultExpanded={false} level={2}>
                                        <AccordionSummary level={2}>
                                            <Box width={0} flex="1 1 auto" overflow="hidden">
                                                <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                                    Inner
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ mx: -1 }}>
                                            <MeasurementData measureValues={manhole.inner} />
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
                    {collisionTarget ? (
                        <>
                            <Accordion defaultExpanded={true}>
                                <AccordionSummary>
                                    <Box width={0} flex="1 1 auto" overflow="hidden">
                                        <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                            {collisionTargetKind
                                                ? collisionTargetKind === "lineStrip"
                                                    ? "Line strip"
                                                    : capitalize(collisionTargetKind)
                                                : "Loading..."}
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {collisionValues ? (
                                        <Box px={2} mb={-0.5}>
                                            <Grid container>
                                                <Grid item xs={5}>
                                                    To outer bot:
                                                </Grid>
                                                <Grid item xs={5} mb={1}>
                                                    {vec3.distance(collisionValues[0], collisionValues[1]).toFixed(3)} m
                                                </Grid>

                                                <Grid item xs={5}>
                                                    To inner bot:
                                                </Grid>
                                                <Grid item xs={5}>
                                                    {vec3.distance(collisionValues[0], collisionValues[1]).toFixed(3)} m
                                                    todo
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    ) : null}
                                    {!collisionTarget ? null : measureValues ? (
                                        <MeasurementData
                                            measureValues={measureValues}
                                            settings={collisionSettings}
                                            onSettingsChange={(newValue) => {
                                                dispatch(
                                                    manholeActions.setCollisionSettings({ cylinderMeasure: newValue })
                                                );
                                            }}
                                        />
                                    ) : measureObjectIsVertex(collisionTarget.entity) ? (
                                        <Box p={2}>
                                            <VertexTable vertices={[collisionTarget.entity.parameter]} />
                                        </Box>
                                    ) : null}
                                </AccordionDetails>
                            </Accordion>
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
