import { Box, Table, TableBody, TableHead, TableRow } from "@mui/material";
import { ReadonlyVec3, vec3 } from "gl-matrix";
import { useTranslation } from "react-i18next";

import { TableCell } from "./tableCell";

export function MeasurementTable({ start, end }: { start: ReadonlyVec3; end: ReadonlyVec3 }) {
    const { t } = useTranslation();
    const delta = vec3.sub(vec3.create(), end, start);

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
                <TableRow>
                    <TableCell>{t("start(M)")}</TableCell>
                    {start.map((v, idx) => (
                        <TableCell key={idx} align="right">
                            {v.toFixed(3)}
                        </TableCell>
                    ))}
                </TableRow>
                <TableRow>
                    <TableCell>{t("end(M)")}</TableCell>
                    {end.map((v, idx) => (
                        <TableCell key={idx} align="right">
                            {v.toFixed(3)}
                        </TableCell>
                    ))}
                </TableRow>
                <TableRow>
                    <TableCell bold>{t("difference(M)")}</TableCell>
                    <TableCell bold align="right">
                        {Math.abs(delta[0]).toFixed(3)}
                    </TableCell>
                    <TableCell bold align="right">
                        {Math.abs(delta[1]).toFixed(3)}
                    </TableCell>
                    <TableCell bold align="right">
                        {Math.abs(delta[2]).toFixed(3)}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
