import { ArrowBack, Close, Download } from "@mui/icons-material";
import { Box, Button, IconButton, Snackbar, useTheme } from "@mui/material";
import { useState } from "react";
import { useHistory } from "react-router-dom";

import { Divider, LinearProgress, TextField } from "components";
import { useSelectionBasket } from "contexts/selectionBasket";
import { useAbortController } from "hooks/useAbortController";
import { AsyncStatus } from "types/misc";

export function GltfExport() {
    const theme = useTheme();
    const history = useHistory();
    const basket = useSelectionBasket().idArr;

    const [filename, setFilename] = useState("selection-basket");
    const [abortController] = useAbortController();
    const [exportStatus, setExportStatus] = useState(AsyncStatus.Initial);

    const handleExport = async () => {
        if (!filename || !basket.length) {
            return;
        }

        setExportStatus(AsyncStatus.Loading);
        const signal = abortController.current.signal;

        try {
            const res = await fetch("/export-gltf", {
                signal,
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ objectIds: basket }),
            }).then((res) => (res.ok ? res.blob() : undefined));

            if (res) {
                downloadBlob(res, `${filename}.glb`, "model/gltf-binary");
            }

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
                        Back
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={!filename || exportStatus !== AsyncStatus.Initial}
                        color="grey"
                    >
                        <Download sx={{ mr: 1 }} />
                        Download
                    </Button>
                </Box>
            </Box>

            {exportStatus === AsyncStatus.Loading && (
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
                        disabled={exportStatus !== AsyncStatus.Initial}
                        onChange={(e) => setFilename(e.target.value)}
                    />
                </Box>
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
