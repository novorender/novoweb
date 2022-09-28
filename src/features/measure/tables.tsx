import { Table, TableHead, TableRow, TableCell, Box, TableBody, css, styled, TableCellProps } from "@mui/material";
import { ReadonlyVec3, vec3 } from "gl-matrix";

export const StyledTableCell = styled(TableCell, { shouldForwardProp: (prop) => prop !== "bold" })<
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

export function MeasurementTable({ start, end }: { start: ReadonlyVec3; end: ReadonlyVec3 }) {
    const delta = vec3.sub(vec3.create(), end, start);

    return (
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
                    <StyledTableCell align="right">{start[0].toFixed(3)}</StyledTableCell>
                    <StyledTableCell align="right">{(-start[2]).toFixed(3)}</StyledTableCell>
                    <StyledTableCell align="right">{start[1].toFixed(3)}</StyledTableCell>
                </TableRow>
                <TableRow>
                    <StyledTableCell>End (m)</StyledTableCell>
                    <StyledTableCell align="right">{end[0].toFixed(3)}</StyledTableCell>
                    <StyledTableCell align="right">{(-end[2]).toFixed(3)}</StyledTableCell>
                    <StyledTableCell align="right">{end[1].toFixed(3)}</StyledTableCell>
                </TableRow>
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
            </TableBody>
        </Table>
    );
}

export function VertexTable({ vertices, text }: { vertices: vec3[]; text?: string[] }) {
    return (
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
                {vertices.map((p, i) => (
                    <TableRow key={i}>
                        <StyledTableCell> {text && text.length > i ? text[i] : "Vertex"}</StyledTableCell>
                        <StyledTableCell align="right">{p[0].toFixed(3)}</StyledTableCell>
                        <StyledTableCell align="right">{-p[2].toFixed(3)}</StyledTableCell>
                        <StyledTableCell align="right">{p[1].toFixed(3)}</StyledTableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
