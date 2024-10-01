import {
    Box,
    Button,
    decomposeColor,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { renderActions } from "features/render";

enum ColumnType {
    Number,
    String,
    Color,
}

export function CsvImportView() {
    const { t } = useTranslation();
    const { csv, kind } = useLocation().state as {
        csv: Papa.ParseResult<string[]>;
        kind: "classification" | "elevation";
    };
    const history = useHistory();
    const dispatch = useAppDispatch();

    const columns = useMemo(() => {
        if (kind === "classification") {
            return [
                { name: "position", label: t("code"), type: ColumnType.Number, required: true },
                { name: "label", label: t("label"), type: ColumnType.String },
                { name: "color", label: t("color"), type: ColumnType.Color, required: true },
            ];
        } else {
            return [
                { name: "position", label: t("elevation"), type: ColumnType.Number, required: true },
                { name: "color", label: t("color"), type: ColumnType.Color, required: true },
            ];
        }
    }, [t, kind]);

    const [mapping, setMapping] = useState(csv.data[0].map(() => ""));

    const canSave = useMemo(() => {
        const nonEmptyMapping = mapping.filter((e) => e);
        const hasDups = new Set(nonEmptyMapping).size < nonEmptyMapping.length;
        if (hasDups) {
            return false;
        }

        const allRequiredAssigned = columns.filter((c) => c.required).every((c) => mapping.includes(c.name));
        if (!allRequiredAssigned) {
            return false;
        }

        return true;
    }, [mapping, columns]);

    const cancel = () => {
        history.goBack();
    };

    const save = () => {
        const mappedCols: { col: (typeof columns)[0]; index: number }[] = [];
        mapping.forEach((name, index) => {
            if (name) {
                mappedCols.push({ col: columns.find((c) => c.name === name)!, index });
            }
        });

        const result = csv.data
            .map((row) => {
                return Object.fromEntries(
                    mappedCols.map(({ col, index }) => {
                        const rawValue = row[index];
                        switch (col.type) {
                            case ColumnType.Color: {
                                let value: number[] | null = [];
                                try {
                                    const color = decomposeColor(rawValue);
                                    value = color.values.map((v) => v / 255);
                                    if (value.length === 3) {
                                        value.push(1);
                                    }
                                } catch {
                                    value = null;
                                }
                                return [col.name, value];
                            }
                            case ColumnType.Number: {
                                const value = Number(rawValue);
                                return [col.name, value];
                            }
                            default:
                                return [col.name, rawValue];
                        }
                    }),
                );
            })
            .filter((row) => Number.isFinite(row.position) && row.color);

        const knots = result.toSorted((a, b) => a.position - b.position);

        if (kind === "classification") {
            dispatch(renderActions.setPoints({ classificationColorGradient: { knots } }));
        } else {
            dispatch(renderActions.setTerrain({ elevationGradient: { knots } }));
        }

        history.goBack();
    };

    return (
        <ScrollBox p={2}>
            <Stack gap={2}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {mapping.map((name, i) => (
                                <TableCell key={i}>
                                    <FormControl fullWidth variant="standard" size="small">
                                        <InputLabel>{t("columnN", { i: i + 1 })}</InputLabel>
                                        <Select
                                            value={name}
                                            label={t("columnN", { i: i + 1 })}
                                            onChange={(e) => {
                                                setMapping(mapping.with(i, e.target.value));
                                            }}
                                        >
                                            <MenuItem value="">{t("[none]")}</MenuItem>
                                            {columns.map((col) => (
                                                <MenuItem key={col.name} value={col.name}>
                                                    {col.label + (col.required ? " *" : "")}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {csv.data.map((row, i) => {
                            return (
                                <TableRow key={i}>
                                    {row.map((value, j) => (
                                        <TableCell key={j}>{value}</TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button onClick={cancel} variant="text" color="secondary">
                        {t("cancel")}
                    </Button>
                    <Button onClick={save} variant="contained" disabled={!canSave}>
                        {t("import")}
                    </Button>
                </Box>
            </Stack>
        </ScrollBox>
    );
}
