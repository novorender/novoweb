import { CheckCircle, Error } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    Tooltip,
} from "@mui/material";
import { FormEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Confirmation, TextField } from "components";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, FeatureServerConfig, selectArcgisFeatureServers } from "../arcgisSlice";
import { FeatureServerResp } from "../arcgisTypes";

export function EditFeatureServer() {
    const history = useHistory();
    const dispatch = useAppDispatch();
    const featureServerId = useLocation<{ id?: string }>().state?.id;
    const isNew = featureServerId === undefined;
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const originalFeatureServerConfig =
        featureServers.status === AsyncStatus.Success
            ? featureServers.data.find((c) => c.config.id === featureServerId)?.config
            : undefined;

    const [config, setConfig] = useState<FeatureServerConfig>(
        originalFeatureServerConfig ?? { id: window.crypto.randomUUID(), url: "", name: "", layerWhere: "" }
    );
    const [urlChanged, setUrlChanged] = useState(false);
    const [nameChanged, setNameChanged] = useState(false);

    const [useOnlySelectedLayers, setUseOnlySelectedLayers] = useState((config.enabledLayerIds?.length ?? 0) > 0);
    const [fsMeta, setFsMeta] = useState<AsyncState<FeatureServerResp>>({ status: AsyncStatus.Initial });

    // Remove query params from the entered URL and (maybe) split it into [featureServer, layerId]
    const [fsUrl, urlLayerId] = useMemo(() => {
        if (!config.url || !config.url.trim()) {
            return ["", undefined];
        }

        try {
            const parsedUrl = new URL(config.url);
            const url = parsedUrl.origin + parsedUrl.pathname;
            const match = url.match(/(.+\/FeatureServer)\/(\d+)\/*$/);
            return match ? [match[1], Number(match[2])] : [url, undefined];
        } catch (ex) {
            return ["", undefined];
        }
    }, [config.url]);

    const shouldDebounceLoadMeta = useRef(false);
    useEffect(() => {
        const abortController = new AbortController();
        const timeout = setTimeout(loadMeta, shouldDebounceLoadMeta.current ? 1000 : 0);

        async function loadMeta() {
            shouldDebounceLoadMeta.current = false;

            if (!fsUrl) {
                return;
            }

            setFsMeta({ status: AsyncStatus.Loading });

            try {
                const resp = await fetch(`${fsUrl}?f=json`, { signal: abortController.signal });
                if (!resp.ok) {
                    setFsMeta({ status: AsyncStatus.Error, msg: "Error loading feature server metadata" });
                    return;
                }

                const respJson = await resp.json();
                if (!respJson.layers) {
                    setFsMeta({ status: AsyncStatus.Error, msg: "API response doesn't contain layer information" });
                    return;
                }

                setFsMeta({ status: AsyncStatus.Success, data: respJson });
                setConfig((config) => ({ ...config, url: fsUrl }));
            } catch (e) {
                setFsMeta({ status: AsyncStatus.Error, msg: "Error loading feature server information" });
            }
        }

        return () => {
            abortController.abort();
            clearTimeout(timeout);
        };
    }, [fsUrl]);

    // When someone pastes layer URL - enable "Use only selected layers" and
    // select that layer
    useEffect(() => {
        if (urlLayerId !== undefined) {
            setUseOnlySelectedLayers(true);
            setConfig((config) => ({ ...config, enabledLayerIds: [urlLayerId] }));
        }
    }, [urlLayerId]);

    const originalNames = useMemo(() => {
        if (featureServers.status !== AsyncStatus.Success) {
            return [];
        }

        const otherFeatureServers = featureServerId
            ? featureServers.data.filter((c) => c.config.id !== featureServerId)
            : featureServers.data;
        return otherFeatureServers.map((c) => c.config.name);
    }, [featureServers, featureServerId]);

    const handleSave: FormEventHandler = (e) => {
        e.preventDefault();

        if (isNew) {
            dispatch(arcgisActions.addFeatureServerConfig(config));
        } else {
            dispatch(arcgisActions.updateFeatureServerConfig(config));
        }
        history.goBack();
    };

    if (featureServers.status !== AsyncStatus.Success || !config) {
        return null;
    }

    let urlError = "";
    if (urlChanged) {
        const trimmedUrl = config.url.trim();
        if (trimmedUrl === "") {
            urlError = "Can't be empty";
        } else {
            try {
                new URL(config.url);
            } catch (ex) {
                urlError = "Invalid URL";
            }
        }
    }

    let nameError = "";
    if (nameChanged) {
        const trimmedName = config.name.trim();
        if (trimmedName === "") {
            nameError = "Can't be empty";
        } else if (originalNames.includes(trimmedName)) {
            nameError = "Already taken";
        }
    }

    const handleUrlChange = (url: string) => {
        const prevUrl = config.url;
        const newConfig = { ...config, url };
        if (!newConfig.name) {
            const match = url.match(/services\/(.+)\/FeatureServer/);
            if (match) {
                newConfig.name = match[1];
                setNameChanged(true);
            }
        }
        setUrlChanged(true);

        // One character change could mean that the user is typing and we could debounce
        shouldDebounceLoadMeta.current = Math.abs(prevUrl.length - url.length) === 1;

        setConfig(newConfig);
    };

    return (
        <>
            <Confirmation
                title={`${isNew ? "Add" : "Update"} feature server`}
                confirmBtnText="Save"
                onCancel={() => {
                    history.goBack();
                }}
                component="form"
                onSubmit={handleSave}
                confirmBtnDisabled={Boolean(urlError || nameError || fsMeta.status !== AsyncStatus.Success)}
                justifyContent="start"
                py={2}
            >
                <TextField
                    sx={{ mb: 3 }}
                    multiline
                    fullWidth
                    minRows={3}
                    maxRows={20}
                    value={config.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    error={urlError !== ""}
                    helperText={urlError}
                    label="URL"
                    required
                    InputProps={{
                        endAdornment: fsMeta.status !== AsyncStatus.Initial && (
                            <InputAdornment position="end">
                                {fsMeta.status === AsyncStatus.Loading && <CircularProgress size="1rem" />}
                                {fsMeta.status === AsyncStatus.Success && <CheckCircle color="success" />}
                                {fsMeta.status === AsyncStatus.Error && (
                                    <Tooltip title={fsMeta.msg}>
                                        <Error color="error" />
                                    </Tooltip>
                                )}
                            </InputAdornment>
                        ),
                    }}
                />
                <TextField
                    sx={{ mb: 3 }}
                    fullWidth
                    value={config.name}
                    onChange={(e) => {
                        setConfig({ ...config, name: e.target.value });
                        setNameChanged(true);
                    }}
                    error={nameError !== ""}
                    helperText={nameError}
                    label="Name"
                    required
                />
                <TextField
                    sx={{ mb: 3 }}
                    multiline
                    fullWidth
                    minRows={2}
                    maxRows={20}
                    value={config.layerWhere}
                    onChange={(e) => setConfig({ ...config, layerWhere: e.target.value })}
                    label="Layer filter"
                />
                <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                color="primary"
                                checked={useOnlySelectedLayers}
                                onChange={(e) => {
                                    setUseOnlySelectedLayers(e.target.checked);
                                }}
                            />
                        }
                        label={
                            <Box mr={0.5} display="flex" alignItems="center" gap={1}>
                                Use only selected layers
                                {useOnlySelectedLayers && fsMeta.status === AsyncStatus.Loading && (
                                    <Box display="flex">
                                        <CircularProgress size="1rem" />
                                    </Box>
                                )}
                            </Box>
                        }
                    />
                </Box>

                {useOnlySelectedLayers && fsMeta.status === AsyncStatus.Error && <Box display="flex">{fsMeta.msg}</Box>}

                {useOnlySelectedLayers && fsMeta.status === AsyncStatus.Success && (
                    <LayerList
                        meta={fsMeta.data}
                        enabledLayerIds={config.enabledLayerIds}
                        onToggle={(layerId) => {
                            if (config.enabledLayerIds?.includes(layerId)) {
                                setConfig({
                                    ...config,
                                    enabledLayerIds: config.enabledLayerIds.filter((id) => id !== layerId),
                                });
                            } else {
                                setConfig({
                                    ...config,
                                    enabledLayerIds: [...(config.enabledLayerIds || []), layerId].sort((a, b) => a - b),
                                });
                            }
                        }}
                    />
                )}

                <Box flex="auto" />
            </Confirmation>
        </>
    );
}

function LayerList({
    meta,
    enabledLayerIds,
    onToggle,
}: {
    meta: FeatureServerResp;
    enabledLayerIds: number[] | undefined;
    onToggle: (layerId: number) => void;
}) {
    return (
        <List
            dense
            sx={{
                width: "100%",
                maxHeight: 200,
                bgcolor: "background.paper",
                position: "relative",
                overflow: "auto",
                mb: 1,
            }}
        >
            {meta.layers.map((layer) => {
                const labelId = `layer-checkbox-${layer.id}`;
                const handleToggle = () => onToggle(layer.id);

                return (
                    <ListItem
                        key={layer.id}
                        secondaryAction={
                            <Checkbox
                                edge="end"
                                onChange={handleToggle}
                                checked={enabledLayerIds?.includes(layer.id)}
                                inputProps={{ "aria-labelledby": labelId }}
                            />
                        }
                    >
                        <ListItemText id={labelId} primary={layer.name} />
                    </ListItem>
                );
            })}
        </List>
    );
}
