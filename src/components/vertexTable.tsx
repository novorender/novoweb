import { Box, Table, TableBody, TableHead, TableRow } from "@mui/material";
import { ReadonlyVec3 } from "gl-matrix";
import { useTranslation } from "react-i18next";

import { TableCell } from "./tableCell";

export function VertexTable({ vertices, text }: { vertices: ReadonlyVec3[]; text?: string[] }) {
    const { t } = useTranslation();
    return (
        <Table size="small" padding="none">
            <TableHead>
                <TableRow>
                    <TableCell></TableCell>
                    <TableCell align="center">
                        <Box display="inline-block" ml={1}>
                            {t("x")}
                        </Box>
                    </TableCell>
                    <TableCell align="center">
                        <Box display="inline-block" ml={1}>
                            {t("y")}
                        </Box>
                    </TableCell>
                    <TableCell align="center">
                        <Box display="inline-block" ml={1}>
                            {t("z")}
                        </Box>
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {vertices.map((p, i) => (
                    <TableRow key={i}>
                        <TableCell> {text && text.length > i ? text[i] : "Vertex"}</TableCell>
                        {p.map((v, idx) => (
                            <TableCell key={idx} align="right">
                                {v.toFixed(3)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
