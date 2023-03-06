import { useState } from "react";
import { ObjectData } from "@novorender/webgl-api";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { Close, FileDownload } from "@mui/icons-material";
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Snackbar } from "@mui/material";
import { unparse } from "papaparse";

import { WidgetContainer, LogoSpeedDial, WidgetHeader, LinearProgress } from "components";
import WidgetList from "features/widgetList/widgetList";
import { useAppSelector } from "app/store";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { useAbortController } from "hooks/useAbortController";
import { batchedPropertySearch } from "utils/search";
import { uniqueArray } from "utils/misc";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazySelectionBasket } from "contexts/selectionBasket";

import { List } from "./routes/list";
import { Root } from "./routes/root";

enum ExportStatus {
    Idle,
    Exporting,
    Error,
}

export default function SelectionBasket() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.selectionBasket.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.selectionBasket.key);

    const basketRef = useLazySelectionBasket();
    const [exportStatus, setExportStatus] = useState(ExportStatus.Idle);
    const [abortController] = useAbortController();

    const exportCSV = async () => {
        const basket = basketRef.current.idArr;

        if (!basket.length) {
            return;
        }

        const baseProperties = ["Name", "GUID", "Path"];
        const abortSignal = abortController.current.signal;
        setExportStatus(ExportStatus.Exporting);

        try {
            const nodes = await batchedPropertySearch<ObjectData>({
                scene,
                abortSignal,
                property: "id",
                value: basket.map((n) => String(n)),
                full: true,
            });

            if (abortSignal.aborted) {
                return;
            }

            const allProps = uniqueArray(
                nodes.reduce((props, current) => {
                    return props.concat(current.properties.map(([key]) => key));
                }, baseProperties)
            ).sort((a, b) =>
                baseProperties.includes(a) || baseProperties.includes(b)
                    ? 0
                    : a.localeCompare(b, "en", { sensitivity: "accent" })
            );

            const rows = nodes.map((node) => {
                const obj: Record<string, string> = {
                    Name: node.name,
                    Path: node.path,
                    ...Object.fromEntries(node.properties),
                };

                const row = Array.from({ length: allProps.length }) as string[];

                allProps.forEach((prop, idx) => {
                    if (obj[prop]) {
                        row[idx] = obj[prop];
                    } else {
                        row[idx] = "";
                    }
                });

                return row;
            });

            const data = [allProps, ...rows];
            const csv = unparse(data);
            downloadBlob(csv, "selection-basket.csv", "data:text/csv;charset=utf-8");
            setExportStatus(ExportStatus.Idle);
        } catch {
            setExportStatus(ExportStatus.Error);
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    widget={{ ...featuresConfig.selectionBasket, name: "Selection basket" as any }}
                    WidgetMenu={(props) => (
                        <Menu {...props} open={exportStatus === ExportStatus.Error ? false : props.open}>
                            <div>
                                <MenuItem
                                    onClick={() => {
                                        exportCSV();

                                        if (props.onClose) {
                                            props.onClose({}, "backdropClick");
                                        }
                                    }}
                                    disabled={![ExportStatus.Idle, ExportStatus.Error].includes(exportStatus)}
                                >
                                    <>
                                        <ListItemIcon>
                                            <FileDownload fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>
                                            {exportStatus === ExportStatus.Exporting ? "Exporting" : "Export as"} CSV
                                        </ListItemText>
                                    </>
                                </MenuItem>
                            </div>
                        </Menu>
                    )}
                    disableShadow
                />

                {exportStatus === ExportStatus.Exporting ? (
                    <Box position={"relative"} bottom={3}>
                        <LinearProgress />
                    </Box>
                ) : null}

                {exportStatus === ExportStatus.Error ? (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        sx={{
                            width: { xs: "auto", sm: 350 },
                            bottom: { xs: "auto", sm: 24 },
                            top: { xs: 24, sm: "auto" },
                        }}
                        autoHideDuration={2500}
                        open={exportStatus === ExportStatus.Error}
                        onClose={() => setExportStatus(ExportStatus.Idle)}
                        message="Export failed"
                        action={
                            <IconButton
                                size="small"
                                aria-label="close"
                                color="inherit"
                                onClick={() => setExportStatus(ExportStatus.Idle)}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        }
                    />
                ) : null}

                <Box
                    display={!menuOpen && !minimized ? "flex" : "none"}
                    flexDirection="column"
                    overflow="hidden"
                    height={1}
                >
                    <MemoryRouter>
                        <Switch>
                            <Route path="/" exact>
                                <Root />
                            </Route>
                            <Route path="/list">
                                <List />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </Box>

                {menuOpen && <WidgetList widgetKey={featuresConfig.selectionBasket.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
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
