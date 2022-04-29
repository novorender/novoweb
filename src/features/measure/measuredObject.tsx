import { vec3 } from "gl-matrix";
import { useEffect } from "react";
import { MeasurementValues, MeasureObject, MeasureSettings } from "@novorender/webgl-api";
import {
    Box,
    FormControlLabel,
    Checkbox,
    RadioGroup,
    Radio,
    capitalize,
    Grid,
    List,
    ListItem,
    css,
    styled,
} from "@mui/material";
import { PushPin } from "@mui/icons-material";

import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useMountedState } from "hooks/useMountedState";

import { measureActions, SelectedMeasureObj, selectMeasure } from "./measureSlice";
import { Slope } from "./slope";
import { VertexTable, MeasurementTable } from "./tables";
import { PlanarDiff } from "./planarDiff";

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
    const { pinned } = useAppSelector(selectMeasure);
    const isPinned = pinned === idx;

    const [measurement, setMeasurement] = useMountedState<
        { obj: MeasureObject; val: MeasurementValues } | vec3 | undefined
    >(undefined);

    useEffect(() => {
        initMeasureObj();

        async function initMeasureObj() {
            if (measureScene) {
                const measureObj = await measureScene.downloadMeasureObject(obj.id, obj.pos).catch(() => undefined);
                const measureVal = measureObj?.selectedEntity
                    ? await measureScene.measure(measureObj.selectedEntity)
                    : undefined;

                if (measureObj && measureObj.selectedEntity?.kind === "vertex") {
                    setMeasurement(measureObj.selectedEntity.parameter as vec3);
                } else if (measureObj && measureVal) {
                    setMeasurement({ obj: measureObj, val: measureVal });
                } else {
                    setMeasurement(obj.pos);
                }
            }
        }
    }, [measureScene, obj, setMeasurement, idx, dispatch]);

    const kind = !measurement ? "" : "obj" in measurement ? getMeasurementValueKind(measurement.val) : "point";

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
                        {kind ? capitalize(kind) : obj.id}
                    </Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {kind === "cylinder" ? (
                    <>
                        <RadioGroup
                            row
                            aria-label="Cylinder measure point position"
                            onChange={(e, value) => {
                                dispatch(
                                    measureActions.setSettings({
                                        idx,
                                        settings: {
                                            ...obj.settings,
                                            cylinderMeasure: value as MeasureSettings["cylinderMeasure"],
                                        },
                                    })
                                );
                            }}
                            value={obj.settings?.cylinderMeasure ?? "center"}
                            name="radio-buttons-group"
                            sx={{ px: 1.8, mb: 0.5 }}
                        >
                            <FormControlLabel value={"furthest"} control={<Radio size="small" />} label="Furthest" />
                            <FormControlLabel value={"center"} control={<Radio size="small" />} label="Center" />
                            <FormControlLabel value={"closest"} control={<Radio size="small" />} label="Closest" />
                        </RadioGroup>
                    </>
                ) : null}
                {!measurement ? null : "obj" in measurement ? (
                    <MeasurementData measureValues={measurement.val} />
                ) : (
                    <Box p={2}>
                        <VertexTable vertices={[measurement]} />
                    </Box>
                )}
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
                            <PlanarDiff start={duoMeasurementValues.pointA!} end={duoMeasurementValues.pointB!} />
                        ) : null}
                        {showSlope ? (
                            <Slope start={duoMeasurementValues.pointA!} end={duoMeasurementValues.pointB!} />
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

function MeasurementData({ measureValues }: { measureValues: MeasurementValues }) {
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
        case "plane":
            return (
                <>
                    <List dense>
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
                    </List>
                    {measureValues.vertices.length > 0 ? (
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
                        <Slope start={measureValues.centerLineStart} end={measureValues.centerLineEnd} />
                    </List>
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

export function isMeasureObject(obj: any): obj is MeasureObject {
    return obj && "selectedEntity" in obj && "id" in obj;
}

function getMeasurementValueKind(val: MeasurementValues): string {
    return "kind" in val ? val.kind : "";
}
