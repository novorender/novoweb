import { ArrowBack, Close, Download } from "@mui/icons-material";
import { Box, Button, Checkbox, IconButton, ListItemButton, Snackbar, Typography, useTheme } from "@mui/material";
import { ObjectData } from "@novorender/webgl-api";
import { unparse } from "papaparse";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import { Divider, FixedSizeVirualizedList, LinearProgress, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useSelectionBasket } from "contexts/selectionBasket";
import { useAbortController } from "hooks/useAbortController";
import { AsyncStatus } from "types/misc";
import { uniqueArray } from "utils/misc";
import { batchedPropertySearch } from "utils/search";

const baseProperties = ["Name", "GUID", "Path"];

export function CsvExport() {
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const basket = useSelectionBasket().idArr;

    const [filename, setFilename] = useState("selection-basket");
    const [objects, setObjects] = useState<ObjectData[]>();
    const [properties, setProperties] = useState<[string, boolean][]>([]);
    const [abortController, abort] = useAbortController();
    const [exportStatus, setExportStatus] = useState(AsyncStatus.Initial);

    useEffect(() => {
        loadObjectMetadata();

        async function loadObjectMetadata() {
            if (!basket.length) {
                setObjects([]);
                setProperties([]);
                return;
            }

            setObjects(undefined);
            abort();
            const abortSignal = abortController.current.signal;
            try {
                const nodes = await batchedPropertySearch<ObjectData>({
                    db,
                    abortSignal,
                    property: "id",
                    value: basket.map((n) => String(n)),
                    full: true,
                });

                if (abortSignal.aborted) {
                    throw new Error("aborted");
                }

                setObjects(nodes);
                setProperties(
                    baseProperties
                        .concat(
                            uniqueArray<string>(
                                nodes.reduce((prev, current) => {
                                    prev.push(
                                        ...current.properties.map(([key]) => key).filter((key) => key !== "GUID"),
                                    );
                                    return prev;
                                }, [] as string[]),
                            ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" })),
                        )
                        .map((property) => [property, true]),
                );
            } catch (e) {
                if (!abortSignal.aborted) {
                    console.warn(e);
                    setObjects([]);
                    setProperties([]);
                    setExportStatus(AsyncStatus.Error);
                }
            }
        }
    }, [db, basket, abortController, abort]);

    const handleExport = () => {
        if (!filename || !objects) {
            return;
        }

        setExportStatus(AsyncStatus.Loading);

        const props = properties.reduce((prev, current) => {
            if (current[1]) {
                prev.push(current[0]);
            }

            return prev;
        }, [] as string[]);

        const rows = objects.map((node) => {
            const obj: Record<string, string> = {
                Name: node.name,
                Path: node.path,
                ...Object.fromEntries(node.properties),
            };

            const row = Array.from({ length: props.length }) as string[];

            props.forEach((prop, idx) => {
                if (obj[prop]) {
                    row[idx] = obj[prop];
                } else {
                    row[idx] = "";
                }
            });

            return row;
        });

        try {
            const data = [props, ...rows];
            const csv = unparse(data);
            downloadBlob(csv, `${filename}.csv`, "data:text/csv;charset=utf-8");
            setExportStatus(AsyncStatus.Initial);
        } catch (e) {
            console.warn(e);
            setExportStatus(AsyncStatus.Error);
        }
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent={"space-between"}>
                    <Button onClick={() => history.goBack()} color="grey" sx={{ mr: 3 }}>
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button onClick={handleExport} disabled={!filename || !objects} color="grey">
                        <Download sx={{ mr: 1 }} />
                        {t("download")}
                    </Button>
                </Box>
            </Box>

            {(!objects || exportStatus === AsyncStatus.Loading) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}

            {exportStatus === AsyncStatus.Error ? (
                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    sx={{
                        width: { xs: "auto", sm: 350 },
                        bottom: { xs: "auto", sm: 24 },
                        top: { xs: 24, sm: "auto" },
                    }}
                    autoHideDuration={2500}
                    open={exportStatus === AsyncStatus.Error}
                    onClose={() => setExportStatus(AsyncStatus.Initial)}
                    message="An error occured while preparing export"
                    action={
                        <IconButton
                            size="small"
                            aria-label="close"
                            color="inherit"
                            onClick={() => setExportStatus(AsyncStatus.Initial)}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    }
                />
            ) : null}

            <Box p={1} mt={1}>
                <Box mt={1}>
                    <TextField
                        size="small"
                        fullWidth
                        label="Filename"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                    />
                </Box>
            </Box>
            <Box mt={1} px={1} display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={600}>{t("properties")}</Typography>
                <Box>
                    <Button
                        onClick={() =>
                            setProperties((state) =>
                                state.map((property, idx) => (idx === 0 ? [property[0], true] : [property[0], false])),
                            )
                        }
                    >
                        {t("unselectAll")}
                    </Button>
                    <Button
                        sx={{ ml: 2 }}
                        onClick={() => setProperties((state) => state.map((property) => [property[0], true]))}
                    >
                        {t("selectAll")}
                    </Button>
                </Box>
            </Box>
            <Divider />
            <Box flexGrow={1}>
                <AutoSizer>
                    {({ height, width }) => (
                        <FixedSizeVirualizedList
                            height={height}
                            itemCount={properties.length}
                            width={width}
                            itemSize={35}
                            overscanCount={10}
                        >
                            {({ index, style }) => {
                                return (
                                    <ListItemButton
                                        style={style}
                                        disableGutters
                                        sx={{ px: 1 }}
                                        onClick={() =>
                                            setProperties((state) => {
                                                if (index === 0) {
                                                    return state;
                                                }

                                                const newState = [...state];
                                                newState[index][1] = !newState[index][1];
                                                return newState;
                                            })
                                        }
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                width: 0,
                                                flex: "1 1 100%",
                                            }}
                                        >
                                            <Typography noWrap={true}>{properties[index][0]}</Typography>
                                        </Box>
                                        <Checkbox
                                            aria-label={"Select property"}
                                            size="small"
                                            disabled={index === 0}
                                            checked={properties[index][1]}
                                        />
                                    </ListItemButton>
                                );
                            }}
                        </FixedSizeVirualizedList>
                    )}
                </AutoSizer>
            </Box>
        </>
    );
}

function downloadBlob(content: BlobPart, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    a.click();
}
