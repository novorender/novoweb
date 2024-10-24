import { InfoOutlined, PushPin } from "@mui/icons-material";
import {
    Box,
    capitalize,
    Checkbox,
    css,
    Grid,
    IconButton,
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
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary, MeasurementTable, Tooltip, VertexTable } from "components";
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
    `,
);

const NestedAccordionDetails = styled(AccordionDetails)(
    ({ theme }) => css`
        background: ${theme.palette.grey[200]};
        padding-left: ${theme.spacing(1)};
        padding-right: ${theme.spacing(1)};
    `,
);

const empty = undefined;

export function MeasuredObject({ obj, idx }: { obj: ExtendedMeasureEntity; idx: number }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const { pinned, duoMeasurementValues, currentIndex } = useAppSelector(selectMeasure);
    const isPinned = pinned === idx;

    const measureObjects = useMeasureObjects();
    const currentMeasureValues = duoMeasurementValues[currentIndex];
    const currentMeasureObject = measureObjects.length > currentIndex ? measureObjects[currentIndex][idx] : empty;
    const [measureValues, setMeasureValues] = useState<MeasurementValues>();
    const [isGenerated, setIsGenerated] = useState<null | boolean>(null);

    useEffect(() => {
        getMeasureValues();

        async function getMeasureValues() {
            if (currentMeasureObject) {
                setMeasureValues(
                    await view?.measure?.core.measure(currentMeasureObject, undefined, currentMeasureObject.settings),
                );
            } else {
                setMeasureValues(undefined);
            }
        }
    }, [currentMeasureObject, view]);

    useEffect(() => {
        checkIsGenerated();

        async function checkIsGenerated() {
            if (!view) {
                return;
            }

            setIsGenerated(Boolean(await view.measure?.core.isParametricDataGenerated(obj.ObjectId)));
        }
    }, [view, obj]);

    const kind = !currentMeasureObject ? "" : measureValues ? getMeasurementValueKind(measureValues) : "point";

    const _idx = idx === 0 ? "measureInfoA" : "measureInfoB";
    const useCylinderMeasureSettings = currentMeasureValues && currentMeasureValues.result[_idx]?.validMeasureSettings;

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
                {isGenerated && (
                    <Tooltip title={"This parametric data is generated."} enterDelay={0}>
                        <IconButton
                            onClick={(evt) => {
                                evt.stopPropagation();
                            }}
                        >
                            <InfoOutlined />
                        </IconButton>
                    </Tooltip>
                )}
            </AccordionSummary>
            <AccordionDetails>
                {!currentMeasureObject ? null : measureValues ? (
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
                                }),
                            );
                        }}
                    />
                ) : measureObjectIsVertex(currentMeasureObject) ? (
                    <Box p={2}>
                        <VertexTable vertices={[currentMeasureObject.parameter]} />
                    </Box>
                ) : null}
            </AccordionDetails>
        </Accordion>
    );
}

export function MeasuredResult({ duoMeasurementValues }: { duoMeasurementValues: DuoMeasurementValues | undefined }) {
    const { t } = useTranslation();

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
            <AccordionSummary sx={{ fontWeight: 600 }}>{t("result")}</AccordionSummary>
            <AccordionDetails>
                <>
                    <List>
                        {duoMeasurementValues.distance ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        {t("distance")}
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
                                        {t("angle")}
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
                                        {t("normalDistance")}
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
                                        {t("parameter")}
                                        {arr.length === 2 ? (idx === 0 ? "A" : "B") : ""}
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
                            <NestedAccordionSummary>{t("components")}</NestedAccordionSummary>
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
    const { t } = useTranslation();

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
                                    {t("length")}
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
                            <NestedAccordionSummary>{t("components")}</NestedAccordionSummary>
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
                                        {t("length")}
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
                                {t("diameter")}
                            </Grid>
                            <Grid item xs={5}>
                                {(measureValues.radius * 2).toFixed(3)} m
                            </Grid>
                            <Grid item xs={5}>
                                {t("totalAngle")}
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
                                        {t("height")}
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
                                        {t("width")}
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.width.toFixed(3)} m
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.errorMargin ? (
                            <ListItem>
                                <Tooltip
                                    title={
                                        "Since the generated surface from triangles does not have all points lying directly on the plane, the error represents the maximum normal distance from the plane."
                                    }
                                    enterDelay={0}
                                >
                                    <Grid container>
                                        <Grid item xs={5}>
                                            Error margin
                                        </Grid>
                                        <Grid item xs={5}>
                                            {measureValues.errorMargin.toFixed(3)} m
                                        </Grid>
                                    </Grid>
                                </Tooltip>
                            </ListItem>
                        ) : null}
                        {measureValues.area ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        {t("area")}
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
                                        {`${(
                                            (measureValues.outerRadius
                                                ? Math.min(
                                                      measureValues.outerRadius as number,
                                                      measureValues.innerRadius as number,
                                                  )
                                                : measureValues.innerRadius) * 2
                                        ).toFixed(3)} m`}
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
                                        {`${(
                                            (measureValues.innerRadius
                                                ? Math.max(
                                                      measureValues.outerRadius as number,
                                                      measureValues.innerRadius as number,
                                                  )
                                                : measureValues.outerRadius) * 2
                                        ).toFixed(3)} m`}
                                    </Grid>
                                </Grid>
                            </ListItem>
                        ) : null}
                        {measureValues.heightAboveXyPlane !== undefined ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        {t("elevation")}
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
                                <NestedAccordionSummary>{t("components")}</NestedAccordionSummary>
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
                                    {t("diameter")}
                                </Grid>
                                <Grid item xs={5}>
                                    {(measureValues.radius * 2).toFixed(3)} m
                                </Grid>
                            </Grid>
                        </ListItem>
                        <ListItem>
                            <Grid container>
                                <Grid item xs={5}>
                                    {t("length")}
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
                            <InputLabel sx={{ color: "text.primary", fontWeight: 600 }}>{t("measureFrom")}</InputLabel>
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
                            <NestedAccordionSummary>{t("components")}</NestedAccordionSummary>
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
        case "polymesh":
            return (
                <>
                    <List dense>
                        {measureValues.perimiter ? (
                            <ListItem>
                                <Grid container>
                                    <Grid item xs={5}>
                                        Perimiter
                                    </Grid>
                                    <Grid item xs={5}>
                                        {measureValues.perimiter.toFixed(3)} m
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
        default:
            return null;
    }
}
