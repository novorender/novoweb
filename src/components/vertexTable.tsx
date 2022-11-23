import { Table, TableHead, TableRow, Box, TableBody } from "@mui/material";
import { ReadonlyVec3 } from "gl-matrix";

import { TableCell } from "components";

export function VertexTable({ vertices, text }: { vertices: ReadonlyVec3[]; text?: string[] }) {
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
                {vertices.map((p, i) => (
                    <TableRow key={i}>
                        <TableCell> {text && text.length > i ? text[i] : "Vertex"}</TableCell>
                        <TableCell align="right">{p[0].toFixed(3)}</TableCell>
                        <TableCell align="right">{-p[2].toFixed(3)}</TableCell>
                        <TableCell align="right">{p[1].toFixed(3)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
