import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";
import { MeasureEntity, MeasurementValues, MeasureSettings, PointEntity } from "@novorender/measure-api";
import {
    Box,
    Checkbox,
    capitalize,
    Grid,
    List,
    ListItem,
    css,
    styled,
    Select,
    InputLabel,
    OutlinedInput,
    MenuItem,
} from "@mui/material";
import { PushPin } from "@mui/icons-material";

import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { measureActions, SelectedMeasureObj, selectMeasure } from "./measureSlice";
import { Slope } from "./slope";
import { VertexTable, MeasurementTable } from "./tables";
import { PlanarDiff } from "./planarDiff";
import { useMeasureObjects } from "./useMeasureObjects";
import { cylinderOptions } from "./config";

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

export function MeasuredObject({ obj, idx }: { obj: SelectedMeasureObj; idx: number }) {
    const {
        state: { measureScene },
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
                setMeasureValues(await measureScene.measure(measureObject, undefined, measureObject.settings));
            } else {
                setMeasureValues(undefined);
            }
        }
    }, [measureObject, measureScene]);

    const kind = !measureObject ? "" : measureValues ? getMeasurementValueKind(measureValues) : "point";

    const _idx = idx === 0 ? "a" : "b";
    const useCylinderMeasureSettings =
        duoMeasurementValues &&
        (!duoMeasurementValues.validMeasureSettings || duoMeasurementValues.validMeasureSettings[_idx]);

    const isVertex = (measureObject: MeasureEntity | undefined): measureObject is PointEntity => {
        return measureObject ? measureObject.drawKind === "vertex" : false;
    };
    return (
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
                        {kind ? (kind === "lineStrip" ? "Line strip" : capitalize(kind)) : obj.id}
                    </Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {!measureObject ? null : measureValues ? (
                    <MeasurementData
                        measureValues={measureValues}
                        settings={obj.settings}
                        useCylinderMeasureSettings={useCylinderMeasureSettings ? useCylinderMeasureSettings : false}
                        idx={idx}
                    />
                ) : isVertex(measureObject) ? (
                    <Box p={2}>
                        <VertexTable vertices={[measureObject.parameter]} />
                    </Box>
                ) : null}
            </AccordionDetails>
        </Accordion>
    );
}

export function MeasuredResult() {
    const { duoMeasurementValues } = useAppSelector(selectMeasure);

    if (!duoMeasurementValues) {
        return null;
    }

    const pts =
        duoMeasurementValues.pointA && duoMeasurementValues.pointB
            ? [duoMeasurementValues.pointA, duoMeasurementValues.pointB]
            : duoMeasurementValues.normalPoints;

    const showSlope = duoMeasurementValues.pointA && duoMeasurementValues.pointB;
    const showPlanarDiff = duoMeasurementValues.pointA && duoMeasurementValues.pointB;
    return (
        <Accordion defaultExpanded={true}>
            <AccordionSummary sx={{ fontWeight: 600 }}>Result</AccordionSummary>
            <AccordionDetails>
                <>
                    <List>
                        {duoMeasurementValues.distance ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        Distance
                                    </Grid>
                                    <Grid item xs={6}>
                                        {duoMeasurementValues.distance.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {duoMeasurementValues.angle ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        Angle
                                    </Grid>
                                    <Grid item xs={6}>
                                        {(duoMeasurementValues.angle * (180 / Math.PI)).toFixed(3)} °
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {duoMeasurementValues.normalDistance ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        Normal distance
                                    </Grid>
                                    <Grid item xs={6}>
                                        {duoMeasurementValues.normalDistance.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {showPlanarDiff ? (
                            <ListItem>
                                <PlanarDiff start={duoMeasurementValues.pointA!} end={duoMeasurementValues.pointB!} />
                            </ListItem>
                        ) : null}
                        {showSlope ? (
                            <ListItem>
                                <Slope start={duoMeasurementValues.pointA!} end={duoMeasurementValues.pointB!} />
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
    useCylinderMeasureSettings,
    idx,
    simpleCylinder,
    settings,
}: {
    measureValues: MeasurementValues;
    useCylinderMeasureSettings: boolean;
    idx: number;
    settings?: MeasureSettings;
    simpleCylinder?: boolean;
}) {
    const dispatch = useAppDispatch();
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
                                <Grid item xs={4}>
                                    Length
                                </Grid>
                                <Grid item xs={6}>
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
                                    <Grid item xs={4}>
                                        Length
                                    </Grid>
                                    <Grid item xs={6}>
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
                            <Grid item xs={4}>
                                Radius
                            </Grid>
                            <Grid item xs={6}>
                                {measureValues.radius.toFixed(3)} m
                            </Grid>
                            <Grid item xs={4}>
                                Total angle
                            </Grid>
                            <Grid item xs={6}>
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
                                    <Grid item xs={4}>
                                        Height
                                    </Grid>
                                    <Grid item xs={6}>
                                        {measureValues.height.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.width ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        Width
                                    </Grid>
                                    <Grid item xs={6}>
                                        {measureValues.width.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.area ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        Area
                                    </Grid>
                                    <Grid item xs={6}>
                                        {measureValues.area.toFixed(3)} &#13217;
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.innerRadius ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        {measureValues.outerRadius ? "Inner radius" : "Radius"}
                                    </Grid>
                                    <Grid item xs={6}>
                                        {(measureValues.outerRadius
                                            ? Math.min(
                                                  measureValues.outerRadius as number,
                                                  measureValues.innerRadius as number
                                              )
                                            : measureValues.innerRadius
                                        ).toFixed(3)}{" "}
                                        m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.outerRadius ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        {measureValues.innerRadius ? "Outer radius" : "Radius"}
                                    </Grid>
                                    <Grid item xs={6}>
                                        {(measureValues.innerRadius
                                            ? Math.max(
                                                  measureValues.outerRadius as number,
                                                  measureValues.innerRadius as number
                                              )
                                            : measureValues.outerRadius
                                        ).toFixed(3)}{" "}
                                        m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.heightAboveXyPlane !== undefined ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={4}>
                                        Elevation
                                    </Grid>
                                    <Grid item xs={6}>
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
                                <Grid item xs={4}>
                                    Diameter
                                </Grid>
                                <Grid item xs={6}>
                                    {(measureValues.radius * 2).toFixed(3)} m
                                </Grid>
                            </Grid>
                        </ListItem>
                        <ListItem>
                            <Grid container>
                                <Grid item xs={4}>
                                    Length
                                </Grid>
                                <Grid item xs={6}>
                                    {distance.toFixed(3)} m
                                </Grid>
                            </Grid>
                        </ListItem>
                        {simpleCylinder ? null : (
                            <ListItem>
                                <Slope start={measureValues.centerLineStart} end={measureValues.centerLineEnd} />
                            </ListItem>
                        )}
                    </List>
                    {simpleCylinder ? null : (
                        <Box px={2} flex="1 1 auto" overflow="hidden">
                            <InputLabel sx={{ color: "text.primary" }}>Measure from: </InputLabel>
                            <Select
                                fullWidth
                                name="pivot"
                                size="small"
                                value={settings?.cylinderMeasure ? settings.cylinderMeasure : "center"}
                                onChange={(e) => {
                                    dispatch(
                                        measureActions.setSettings({
                                            idx,
                                            settings: {
                                                ...settings,
                                                cylinderMeasure: e.target.value as MeasureSettings["cylinderMeasure"],
                                            },
                                        })
                                    );
                                }}
                                input={<OutlinedInput fullWidth />}
                            >
                                {cylinderOptions.map((opt) => (
                                    <MenuItem
                                        disabled={
                                            useCylinderMeasureSettings
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
                                    start={measureValues.centerLineStart}
                                    end={measureValues.centerLineEnd}
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

function getMeasurementValueKind(val: MeasurementValues): string {
    return "kind" in val ? val.kind : "";
}
