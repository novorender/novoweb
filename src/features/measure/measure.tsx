import {
    Box,
    Button,
    FormControlLabel,
    styled,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableCellProps,
} from "@mui/material";
import { vec3 } from "gl-matrix";
import { useEffect } from "react";
import { css } from "@mui/styled-engine";

import { IosSwitch, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectMeasure } from "slices/renderSlice";
import { useToggle } from "hooks/useToggle";
import { WidgetList } from "features/widgetList";
import { featuresConfig } from "config/features";

import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

const StyledTableCell = styled(TableCell, { shouldForwardProp: (prop) => prop !== "bold" })<
    TableCellProps & { bold?: boolean }
>(
    ({ bold, theme }) => css`
        font-weight: ${bold ? 600 : 400};
        line-height: 1.6em;
        padding: ${theme.spacing(0.5)} ${theme.spacing(1)};

        &:first-of-type {
            padding-left: 0;
        }
    `
);

export function Measure() {
    const [menuOpen, toggleMenu] = useToggle();
    const dispatch = useAppDispatch();
    const measure = useAppSelector(selectMeasure);
    let { addingPoint, points, distance, distances, angles } = measure;

    useEffect(() => {
        return () => {
            dispatch(renderActions.setMeasure({ addingPoint: false }));
        };
    }, [dispatch]);

    const toggleAddPoint = () => {
        dispatch(renderActions.setMeasure({ addingPoint: !addingPoint }));
    };

    const removeLastPoint = () => {
        const num = distances.length;
        if (num > 0) {
            distance -= distances[num - 1];
            distances = distances.slice(0, -1);
        }
        if (num > 1) {
            angles = angles.slice(0, -1);
        }
        points = points.slice(0, -1);
        dispatch(renderActions.setMeasure({ points, distances, angles, distance }));
    };

    const v0 = points[0];
    const v1 = points[1];
    const delta = v0 && v1 ? vec3.sub(vec3.create(), v1, v0) : undefined;

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.measure}>
                    {!menuOpen ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={addingPoint}
                                        onChange={toggleAddPoint}
                                    />
                                }
                                label={<Box fontSize={14}>Add point</Box>}
                            />
                            <Button onClick={removeLastPoint} color="grey" disabled={points.length < 1}>
                                <DeleteSweepIcon sx={{ mr: 1 }} />
                                Remove last point
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box display={menuOpen ? "none" : "flex"} flexDirection="column">
                    {points.length > 0 && points.length < 3 && (
                        <Box p={1} mt={1}>
                            <Table size="small" padding="none">
                                <TableHead>
                                    <TableRow>
                                        <TableCell></TableCell>
                                        <StyledTableCell align="center">
                                            <Box display="inline-block" ml={1}>
                                                X
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Box display="inline-block" ml={1}>
                                                Y
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Box display="inline-block" ml={1}>
                                                Z
                                            </Box>
                                        </StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <StyledTableCell>Start (m)</StyledTableCell>
                                        <StyledTableCell align="right">{v0[0].toFixed(3)}</StyledTableCell>
                                        <StyledTableCell align="right">{(-v0[2]).toFixed(3)}</StyledTableCell>
                                        <StyledTableCell align="right">{v0[1].toFixed(3)}</StyledTableCell>
                                    </TableRow>
                                    {v1 ? (
                                        <TableRow>
                                            <StyledTableCell>End (m)</StyledTableCell>
                                            <StyledTableCell align="right">{v1[0].toFixed(3)}</StyledTableCell>
                                            <StyledTableCell align="right">{(-v1[2]).toFixed(3)}</StyledTableCell>
                                            <StyledTableCell align="right">{v1[1].toFixed(3)}</StyledTableCell>
                                        </TableRow>
                                    ) : null}
                                    {delta ? (
                                        <TableRow>
                                            <StyledTableCell bold>Difference (m)</StyledTableCell>
                                            <StyledTableCell bold align="right">
                                                {Math.abs(delta[0]).toFixed(3)}
                                            </StyledTableCell>
                                            <StyledTableCell bold align="right">
                                                {Math.abs(delta[2]).toFixed(3)}
                                            </StyledTableCell>
                                            <StyledTableCell bold align="right">
                                                {Math.abs(delta[1]).toFixed(3)}
                                            </StyledTableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                    {distance > 0 && (
                        <Box p={1} display="flex" alignItems="center">
                            {points.length > 2 ? "Total Distance" : "Distance"}: {distance.toFixed(3)}m
                        </Box>
                    )}
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.measure.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.measure.key}-widget-menu-fab`}
            />
        </>
    );
}
