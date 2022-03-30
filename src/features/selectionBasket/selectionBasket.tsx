import { useEffect } from "react";
import { unparse } from "papaparse";
import { ObjectData } from "@novorender/webgl-api";
import { AddCircle, Close, DeleteSweep, FileDownload, RemoveCircle } from "@mui/icons-material";
import {
    Box,
    Button,
    Typography,
    RadioGroup,
    FormControlLabel,
    Radio,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    IconButton,
    Snackbar,
} from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { useAbortController } from "hooks/useAbortController";
import { batchedPropertySearch } from "utils/search";
import { uniqueArray } from "utils/misc";

import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useDispatchVisible, useVisible, visibleActions } from "contexts/visible";
import {
    ObjectVisibility,
    renderActions,
    selectDefaultVisibility,
    SelectionBasketMode,
    selectSelectionBasketMode,
} from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useMountedState } from "hooks/useMountedState";

enum ExportStatus {
    Idle,
    Exporting,
    Error,
}

export function SelectionBasket() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle(false);

    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mode = useAppSelector(selectSelectionBasketMode);
    const { idArr: highlighted } = useHighlighted();
    const { idArr: visible } = useVisible();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchVisible = useDispatchVisible();
    const dispatch = useAppDispatch();

    const [exportStatus, setExportStatus] = useMountedState(ExportStatus.Idle);
    const [abortController] = useAbortController();

    const selectedGroups = customGroups.filter((group) => group.selected);
    const hasHighlighted = highlighted.length || selectedGroups.length;

    useEffect(() => {
        if (mode === SelectionBasketMode.Strict && !visible.length) {
            dispatch(renderActions.setSelectionBasketMode(SelectionBasketMode.Loose));
        }
    }, [visible, mode, dispatch]);

    const handleAdd = () => {
        const fromGroup = selectedGroups.map((grp) => grp.ids).flat();

        dispatchVisible(visibleActions.add(highlighted.concat(fromGroup)));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchCustomGroups(customGroupsActions.set(customGroups.map((group) => ({ ...group, selected: false }))));
    };

    const handleRemove = () => {
        const fromGroup = selectedGroups.map((grp) => grp.ids).flat();

        dispatchVisible(visibleActions.remove(highlighted.concat(fromGroup)));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchCustomGroups(customGroupsActions.set(customGroups.map((group) => ({ ...group, selected: false }))));
    };

    const handleClear = () => {
        dispatchVisible(visibleActions.set([]));
    };

    const handleViewTypeChange = (_: any, value: string) => {
        const val = Number(value) as ObjectVisibility;
        dispatch(renderActions.setDefaultVisibility(val));
    };

    const exportCSV = async () => {
        const abortSignal = abortController.current.signal;
        setExportStatus(ExportStatus.Exporting);

        try {
            const nodes = await batchedPropertySearch<ObjectData>({
                scene,
                abortSignal,
                property: "id",
                value: visible.map((n) => String(n)),
                full: true,
            });

            if (abortSignal.aborted) {
                return;
            }

            const allProps = uniqueArray(
                nodes.reduce(
                    (props, current) => {
                        return props.concat(current.properties.map(([key]) => key));
                    },
                    ["Name", "GUID"] as string[]
                )
            ).sort((a, b) =>
                ["Name", "GUID"].includes(a) || ["Name", "GUID"].includes(b)
                    ? 0
                    : a.localeCompare(b, "en", { sensitivity: "accent" })
            );

            const rows = nodes.map((node) => {
                const obj: Record<string, string> = {
                    Name: node.name,
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
            <WidgetContainer minimized={minimized}>
                <WidgetHeader
                    minimized={minimized}
                    toggleMinimize={toggleMinimize}
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
                                    disabled={
                                        ![ExportStatus.Idle, ExportStatus.Error].includes(exportStatus) ||
                                        !visible.length
                                    }
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
                >
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <Button
                                color="grey"
                                disabled={!hasHighlighted || mode === SelectionBasketMode.Strict}
                                onClick={handleAdd}
                            >
                                <AddCircle sx={{ mr: 1 }} />
                                Add
                            </Button>
                            <Button color="grey" disabled={!hasHighlighted || !visible.length} onClick={handleRemove}>
                                <RemoveCircle sx={{ mr: 1 }} />
                                Remove
                            </Button>
                            <Button color="grey" disabled={!visible.length} onClick={handleClear}>
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>

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

                <Box display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1} mt={1}>
                    <Typography sx={{ mb: 2 }}>Objects in basket: {visible.length}</Typography>
                    <FormControlLabel
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                disabled={!visible.length}
                                checked={mode === SelectionBasketMode.Strict}
                                onChange={() =>
                                    dispatch(
                                        renderActions.setSelectionBasketMode(
                                            mode === SelectionBasketMode.Strict
                                                ? SelectionBasketMode.Loose
                                                : SelectionBasketMode.Strict
                                        )
                                    )
                                }
                            />
                        }
                        label={<Box fontSize={14}>Highlight only from basket</Box>}
                    />
                    <Divider sx={{ mb: 2 }} />
                    <Typography fontWeight={600}>View mode</Typography>
                    <RadioGroup
                        aria-label="View type"
                        value={defaultVisibility}
                        onChange={handleViewTypeChange}
                        name="radio-buttons-group"
                    >
                        <FormControlLabel value={ObjectVisibility.Neutral} control={<Radio />} label="All" />
                        <FormControlLabel
                            value={ObjectVisibility.SemiTransparent}
                            control={<Radio />}
                            label="Basket - Semi-transparent"
                        />
                        <FormControlLabel
                            value={ObjectVisibility.Transparent}
                            control={<Radio />}
                            label="Basket - Transparent"
                        />
                    </RadioGroup>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.selectionBasket.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.selectionBasket.key}-widget-menu-fab`}
            />
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
