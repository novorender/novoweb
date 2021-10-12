import {
    Box,
    Button,
    FormControlLabel,
    makeStyles,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    useTheme,
} from "@material-ui/core";
import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { IosSwitch } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectMeasure } from "slices/renderSlice";

import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";

const useStyles = makeStyles({
    table: {
        tableLayout: "fixed",
    },
    tableCell: {
        fontWeight: 400,
        padding: "4px 8px",
        lineHeight: "1.6em",

        "&:first-child": {
            paddingLeft: 0,
        },
    },
    bold: {
        fontWeight: 600,
    },
});

export function Measure() {
    const theme = useTheme();
    const classes = useStyles();
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
            <Box p={1} boxShadow={theme.customShadows.widgetHeader} display="flex" justifyContent="space-between">
                <FormControlLabel
                    control={
                        <IosSwitch size="medium" color="primary" checked={addingPoint} onChange={toggleAddPoint} />
                    }
                    label={<Box fontSize={14}>Add point</Box>}
                />
                <Button onClick={removeLastPoint} disabled={points.length < 1}>
                    <DeleteSweepIcon />
                    <Box ml={1}>Remove last point</Box>
                </Button>
            </Box>
            {points.length > 0 && points.length < 3 && (
                <Box p={1} mt={1}>
                    <Table size="small" padding="none">
                        <TableHead>
                            <TableCell></TableCell>
                            <TableCell className={classes.tableCell} align="center">
                                <Box display="inline-block" ml={1}>
                                    X
                                </Box>
                            </TableCell>
                            <TableCell className={classes.tableCell} align="center">
                                <Box display="inline-block" ml={1}>
                                    Y
                                </Box>
                            </TableCell>
                            <TableCell className={classes.tableCell} align="center">
                                <Box display="inline-block" ml={1}>
                                    Z
                                </Box>
                            </TableCell>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell className={classes.tableCell}>Start (m)</TableCell>
                                <TableCell className={classes.tableCell} align="right">
                                    {v0[0].toFixed(3)}
                                </TableCell>
                                <TableCell className={classes.tableCell} align="right">
                                    {(-v0[2]).toFixed(3)}
                                </TableCell>
                                <TableCell className={classes.tableCell} align="right">
                                    {v0[1].toFixed(3)}
                                </TableCell>
                            </TableRow>
                            {v1 ? (
                                <TableRow>
                                    <TableCell className={classes.tableCell}>End (m)</TableCell>
                                    <TableCell className={classes.tableCell} align="right">
                                        {v1[0].toFixed(3)}
                                    </TableCell>
                                    <TableCell className={classes.tableCell} align="right">
                                        {(-v1[2]).toFixed(3)}
                                    </TableCell>
                                    <TableCell className={classes.tableCell} align="right">
                                        {v1[1].toFixed(3)}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {delta ? (
                                <TableRow>
                                    <TableCell className={`${classes.tableCell} ${classes.bold}`}>
                                        Difference (m)
                                    </TableCell>
                                    <TableCell className={`${classes.tableCell} ${classes.bold}`} align="right">
                                        {Math.abs(delta[0]).toFixed(3)}
                                    </TableCell>
                                    <TableCell className={`${classes.tableCell} ${classes.bold}`} align="right">
                                        {Math.abs(delta[2]).toFixed(3)}
                                    </TableCell>
                                    <TableCell className={`${classes.tableCell} ${classes.bold}`} align="right">
                                        {Math.abs(delta[1]).toFixed(3)}
                                    </TableCell>
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
        </>
    );
}
