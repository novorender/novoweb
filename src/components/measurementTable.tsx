import { Table, TableHead, TableRow, Box, TableBody } from "@mui/material";
import { ReadonlyVec3, vec3 } from "gl-matrix";

import { TableCell } from "components";

export function MeasurementTable({ start, end }: { start: ReadonlyVec3; end: ReadonlyVec3 }) {
    const delta = vec3.sub(vec3.create(), end, start);

    return (
        <Table size="small" padding="none">
            <TableHead>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell align="center">
                        <Box display="inline-block" ml={1}>
                            X
                        </Box>
                    </TableCell>
                    <TableCell align="center">
                        <Box display="inline-block" ml={1}>
                            Y
                        </Box>
                    </TableCell>
                    <TableCell align="center">
                        <Box display="inline-block" ml={1}>
                            Z
                        </Box>
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                    <TableCell>Start (m)</TableCell>
                    <TableCell align="right">{start[0].toFixed(3)}</TableCell>
                    <TableCell align="right">{(-start[2]).toFixed(3)}</TableCell>
                    <TableCell align="right">{start[1].toFixed(3)}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>End (m)</TableCell>
                    <TableCell align="right">{end[0].toFixed(3)}</TableCell>
                    <TableCell align="right">{(-end[2]).toFixed(3)}</TableCell>
                    <TableCell align="right">{end[1].toFixed(3)}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell bold>Difference (m)</TableCell>
                    <TableCell bold align="right">
                        {Math.abs(delta[0]).toFixed(3)}
                    </TableCell>
                    <TableCell bold align="right">
                        {Math.abs(delta[2]).toFixed(3)}
                    </TableCell>
                    <TableCell bold align="right">
                        {Math.abs(delta[1]).toFixed(3)}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
