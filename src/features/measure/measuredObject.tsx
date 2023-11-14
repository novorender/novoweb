import { PushPin } from "@mui/icons-material";
import {
    Box,
    capitalize,
    Checkbox,
    css,
    Grid,
    InputLabel,
    List,
    ListItem,
    MenuItem,
    OutlinedInput,
    Select,
    styled,
} from "@mui/material";
import { CylinerMeasureType, DuoMeasurementValues, MeasurementValues, MeasureSettings } from "@novorender/api";
import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary, MeasurementTable, VertexTable } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ExtendedMeasureEntity } from "types/misc";
import { getMeasurementValueKind, measureObjectIsVertex } from "utils/misc";

import { cylinderOptions } from "./config";
import { measureActions, selectMeasure } from "./measureSlice";
import { PlanarDiff } from "./planarDiff";
import { Slope } from "./slope";
import { useMeasureObjects } from "./useMeasureObjects";

const NestedAccordionSummary = styled(AccordionSummary)(
    ({ theme }) => css`
        background: ${theme.palette.grey[200]};

        &:hover {
            background: ${theme.palette.grey[300]};
        }
    `
);

const NestedAccordionDetails = styled(AccordionDetails)(
    ({ theme }) => css`
        background: ${theme.palette.grey[200]};
        padding-left: ${theme.spacing(1)};
        padding-right: ${theme.spacing(1)};
    `
);

export function MeasuredObject({ obj, idx }: { obj: ExtendedMeasureEntity; idx: number }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const { pinned, duoMeasurementValues } = useAppSelector(selectMeasure);
    const isPinned = pinned === idx;

    const measureObject = useMeasureObjects()[idx];
    const [measureValues, setMeasureValues] = useState<MeasurementValues>();

    useEffect(() => {
        getMeasureValues();

        async function getMeasureValues() {
            if (measureObject) {
                setMeasureValues(await view?.measure?.core.measure(measureObject, undefined, measureObject.settings));
            } else {
                setMeasureValues(undefined);
            }
        }
    }, [measureObject, view]);

    const kind = !measureObject ? "" : measureValues ? getMeasurementValueKind(measureValues) : "point";

    const _idx = idx === 0 ? "measureInfoA" : "measureInfoB";
    const useCylinderMeasureSettings = duoMeasurementValues && duoMeasurementValues.result[_idx]?.validMeasureSettings;

    return (
        <Accordion defaultExpanded={true}>
            <AccordionSummary>
                <Box flex="0 0 auto">
                    <Checkbox
                        name="pin measured object"
                        aria-label="pin measured object"
                        sx={{ mr: 1, p: 0 }}
                        size="small"
                        icon={<PushPin color="disabled" />}
                        checkedIcon={<PushPin color="primary" />}
                        onChange={() => {
                            if (isPinned) {
                                dispatch(measureActions.unPin());
                            } else {
                                dispatch(measureActions.pin(idx));
                            }
                        }}
                        checked={isPinned}
                        onClick={(event) => event.stopPropagation()}
                        onFocus={(event) => event.stopPropagation()}
                    />
                </Box>
                <Box width={0} flex="1 1 auto" overflow="hidden">
                    <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                        {kind ? (kind === "lineStrip" ? "Line strip" : capitalize(kind)) : "Loading..."}
                    </Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {!measureObject ? null : measureValues ? (
                    <MeasurementData
                        measureValues={measureValues}
                        useCylinderRelativeMeasureSettings={useCylinderMeasureSettings}
                        settings={obj.settings}
                        onSettingsChange={(newValue) => {
                            dispatch(
                                measureActions.setSettings({
                                    idx,
                                    settings: {
                                        cylinderMeasure: newValue as CylinerMeasureType,
                                    },
                                })
                            );
                        }}
                    />
                ) : measureObjectIsVertex(measureObject) ? (
                    <Box p={2}>
                        <VertexTable vertices={[measureObject.parameter]} />
                    </Box>
                ) : null}
            </AccordionDetails>
        </Accordion>
    );
}

export function MeasuredResult({ duoMeasurementValues }: { duoMeasurementValues: DuoMeasurementValues | undefined }) {
    if (!duoMeasurementValues) {
        return null;
    }

    const hasMeasurePoints = duoMeasurementValues.measureInfoA?.point && duoMeasurementValues.measureInfoB?.point;
    const pts = hasMeasurePoints
        ? [duoMeasurementValues.measureInfoA.point, duoMeasurementValues.measureInfoB.point]
        : duoMeasurementValues.normalPoints;

    const showSlope = hasMeasurePoints;
    const showPlanarDiff = hasMeasurePoints;
    const parameters = [
        duoMeasurementValues.measureInfoA?.parameter,
        duoMeasurementValues.measureInfoB?.parameter,
    ].filter((p) => typeof p === "number") as number[];
    return (
        <Accordion defaultExpanded={true}>
            <AccordionSummary sx={{ fontWeight: 600 }}>Result</AccordionSummary>
            <AccordionDetails>
                <>
                    <List>
                        {duoMeasurementValues.distance ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Distance
                                    </Grid>
                                    <Grid item xs={5}>
                                        {duoMeasurementValues.distance.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {duoMeasurementValues.angle ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Angle
                                    </Grid>
                                    <Grid item xs={5}>
                                        {(duoMeasurementValues.angle.radians * (180 / Math.PI)).toFixed(3)} °
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {duoMeasurementValues.normalDistance ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Normal distance
                                    </Grid>
                                    <Grid item xs={5}>
                                        {duoMeasurementValues.normalDistance.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}

                        {showPlanarDiff ? (
                            <ListItem>
                                <PlanarDiff start={pts![0]} end={pts![1]} />
                            </ListItem>
                        ) : null}

                        {parameters.map((p, idx, arr) => (
                            <ListItem key={idx}>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Parameter {arr.length === 2 ? (idx === 0 ? "A" : "B") : ""}
                                    </Grid>
                                    <Grid item xs={5}>
                                        {p.toFixed(3)}
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ))}

                        {showSlope ? (
                            <ListItem>
                                <Slope start={pts![0]} end={pts![1]} />
                            </ListItem>
                        ) : null}
                    </List>
                    <Box p={1}>
                        <Accordion defaultExpanded={true}>
                            <NestedAccordionSummary>Components</NestedAccordionSummary>
                            <NestedAccordionDetails>
                                {pts ? <MeasurementTable start={pts[0]} end={pts[1]} /> : null}
                            </NestedAccordionDetails>
                        </Accordion>
                    </Box>
                </>
            </AccordionDetails>
        </Accordion>
    );
}

export function MeasurementData({
    measureValues,
    useCylinderRelativeMeasureSettings,
    settings,
    onSettingsChange,
}: {
    measureValues: MeasurementValues;
    useCylinderRelativeMeasureSettings?: boolean;
    settings?: MeasureSettings;
    onSettingsChange?: (newValue: string) => void;
}) {
    if (!("kind" in measureValues)) {
        return null;
    }

    switch (measureValues.kind) {
        case "line": {
            return (
                <>
                    <List dense>
                        <ListItem>
                            <Grid container>
                                <Grid item xs={5}>
                                    Length
                                </Grid>
                                <Grid item xs={5}>
                                    {measureValues.distance.toFixed(3)} m
                                </Grid>
                            </Grid>
                        </ListItem>
                        <ListItem>
                            <Slope start={measureValues.start} end={measureValues.end} />
                        </ListItem>
                    </List>
                    <Box p={1}>
                        <Accordion defaultExpanded={false}>
                            <NestedAccordionSummary>Components</NestedAccordionSummary>
                            <NestedAccordionDetails>
                                <MeasurementTable start={measureValues.start} end={measureValues.end} />
                            </NestedAccordionDetails>
                        </Accordion>
                    </Box>
                </>
            );
        }
        case "lineStrip": {
            return (
                <>
                    <List dense>
                        {measureValues.totalLength ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Length
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.totalLength.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                    </List>
                </>
            );
        }
        case "arc": {
            return (
                <List dense>
                    <ListItem>
                        <Grid container>
                            <Grid item xs={5}>
                                Diameter
                            </Grid>
                            <Grid item xs={5}>
                                {(measureValues.radius * 2).toFixed(3)} m
                            </Grid>
                            <Grid item xs={5}>
                                Total angle
                            </Grid>
                            <Grid item xs={5}>
                                {Math.round(measureValues.totalAngle * (180 / Math.PI))} deg
                            </Grid>
                        </Grid>
                    </ListItem>
                </List>
            );
        }
        case "plane":
            return (
                <>
                    <List dense>
                        {measureValues.height ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Height
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.height.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.width ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Width
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.width.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.area ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Area
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.area.toFixed(3)} &#13217;
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.innerRadius ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        {measureValues.outerRadius ? "Inner diameter" : "Diameter"}
                                    </Grid>
                                    <Grid item xs={5}>
                                        {(
                                            (measureValues.outerRadius
                                                ? Math.min(
                                                      measureValues.outerRadius as number,
                                                      measureValues.innerRadius as number
                                                  )
                                                : measureValues.innerRadius) * 2
                                        ).toFixed(3)}{" "}
                                        m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.outerRadius ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        {measureValues.innerRadius ? "Outer diameter" : "Diameter"}
                                    </Grid>
                                    <Grid item xs={5}>
                                        {(
                                            (measureValues.innerRadius
                                                ? Math.max(
                                                      measureValues.outerRadius as number,
                                                      measureValues.innerRadius as number
                                                  )
                                                : measureValues.outerRadius) * 2
                                        ).toFixed(3)}{" "}
                                        m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.heightAboveXyPlane !== undefined ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Elevation
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.heightAboveXyPlane.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                    </List>
                    {measureValues.vertices.length ? (
                        <Box p={1}>
                            <Accordion defaultExpanded={false}>
                                <NestedAccordionSummary>Components</NestedAccordionSummary>
                                <NestedAccordionDetails>
                                    <VertexTable vertices={measureValues.vertices} />
                                </NestedAccordionDetails>
                            </Accordion>
                        </Box>
                    ) : null}
                </>
            );
        case "cylinder": {
            const distance = vec3.dist(measureValues.centerLineStart, measureValues.centerLineEnd);

            return (
                <>
                    <List dense>
                        <ListItem>
                            <Grid container>
                                <Grid item xs={5}>
                                    Diameter
                                </Grid>
                                <Grid item xs={5}>
                                    {(measureValues.radius * 2).toFixed(3)} m
                                </Grid>
                            </Grid>
                        </ListItem>
                        <ListItem>
                            <Grid container>
                                <Grid item xs={5}>
                                    Length
                                </Grid>
                                <Grid item xs={5}>
                                    {distance.toFixed(3)} m
                                </Grid>
                            </Grid>
                        </ListItem>
                        <ListItem>
                            <Slope start={measureValues.centerLineStart} end={measureValues.centerLineEnd} />
                        </ListItem>
                    </List>
                    {onSettingsChange && (
                        <Box px={2} flex="1 1 auto" overflow="hidden">
                            <InputLabel sx={{ color: "text.primary", fontWeight: 600 }}>Measure from: </InputLabel>
                            <Select
                                fullWidth
                                name="pivot"
                                size="small"
                                value={settings?.cylinderMeasure ? settings.cylinderMeasure : "center"}
                                onChange={(event) => onSettingsChange(event.target.value)}
                                input={<OutlinedInput fullWidth />}
                            >
                                {cylinderOptions.map((opt) => (
                                    <MenuItem
                                        disabled={
                                            useCylinderRelativeMeasureSettings
                                                ? false
                                                : opt.val === "closest" || opt.val === "furthest"
                                        }
                                        key={opt.val}
                                        value={opt.val}
                                    >
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    )}
                    <Box p={1}>
                        <Accordion defaultExpanded={false}>
                            <NestedAccordionSummary>Components</NestedAccordionSummary>
                            <NestedAccordionDetails>
                                <MeasurementTable
                                    start={
                                        measureValues.centerLineStart[2] > measureValues.centerLineEnd[2]
                                            ? measureValues.centerLineStart
                                            : measureValues.centerLineEnd
                                    }
                                    end={
                                        measureValues.centerLineStart[2] <= measureValues.centerLineEnd[2]
                                            ? measureValues.centerLineStart
                                            : measureValues.centerLineEnd
                                    }
                                />
                            </NestedAccordionDetails>
                        </Accordion>
                    </Box>
                </>
            );
        }
        default:
            return null;
    }
}
