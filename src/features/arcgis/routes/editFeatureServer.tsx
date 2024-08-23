import { CheckCircle, Error } from "@mui/icons-material";
import {
    Box,
    Button,
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
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, TextField } from "components";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";
import { FeatureServerDefinition } from "../arcgisTypes";
import { FeatureServer } from "../types";

export function EditFeatureServer() {
    const { t } = useTranslation();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const featureServerId = useLocation<{ id?: string }>().state?.id;
    const isNew = featureServerId === undefined;
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const originalFeatureServer =
        featureServers.status === AsyncStatus.Success
            ? featureServers.data.find((c) => c.id === featureServerId)
            : undefined;
    const [isEditingLayerList, setIsEditingLayerList] = useState(false);

    const [featureServer, setFeatureServer] = useState<FeatureServer>(
        originalFeatureServer ?? {
            id: window.crypto.randomUUID(),
            url: "",
            name: "",
            layerWhere: "",
            layers: [],
            definition: { status: AsyncStatus.Initial },
        },
    );
    const [urlChanged, setUrlChanged] = useState(false);
    const [nameChanged, setNameChanged] = useState(false);

    const [useOnlySelectedLayers, setUseOnlySelectedLayers] = useState(
        (featureServer.enabledLayerIds?.length ?? 0) > 0,
    );
    const [fsDefinition, setFsDefinition] = useState<AsyncState<FeatureServerDefinition>>({
        status: AsyncStatus.Initial,
    });

    // Remove query params from the entered URL and (maybe) split it into [featureServer, layerId]
    const [fsUrl, urlLayerId] = useMemo(() => {
        if (!featureServer.url || !featureServer.url.trim()) {
            return ["", undefined];
        }

        try {
            const parsedUrl = new URL(featureServer.url);
            const url = parsedUrl.origin + parsedUrl.pathname;
            const match = url.match(/(.+\/FeatureServer)\/(\d+)\/*$/);
            return match ? [match[1], Number(match[2])] : [url, undefined];
        } catch {
            return ["", undefined];
        }
    }, [featureServer.url]);

    const shouldDebounceLoadingDefinition = useRef(false);
    useEffect(() => {
        const abortController = new AbortController();
        const timeout = setTimeout(loadDefinition, shouldDebounceLoadingDefinition.current ? 1000 : 0);

        async function loadDefinition() {
            shouldDebounceLoadingDefinition.current = false;

            if (!fsUrl) {
                return;
            }

            const parsedUrl = new URL(fsUrl);
            if (!parsedUrl.pathname.match(/\/FeatureServer\/?$/)) {
                setFsDefinition({
                    status: AsyncStatus.Error,
                    msg: "Only feature servers are supported at the moment",
                });
                return;
            }

            setFsDefinition({ status: AsyncStatus.Loading });

            try {
                const resp = await fetch(`${fsUrl}?f=json`, { signal: abortController.signal });
                if (!resp.ok) {
                    setFsDefinition({ status: AsyncStatus.Error, msg: "Error loading feature server definition" });
                    return;
                }

                const respJson = await resp.json();
                if (!respJson.layers) {
                    setFsDefinition({
                        status: AsyncStatus.Error,
                        msg: "API response doesn't contain layer information",
                    });
                    return;
                }

                setFsDefinition({ status: AsyncStatus.Success, data: respJson });
                setFeatureServer((config) => ({ ...config, url: fsUrl }));
            } catch {
                setFsDefinition({ status: AsyncStatus.Error, msg: "Error loading feature server information" });
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
            setFeatureServer((config) => ({ ...config, enabledLayerIds: [urlLayerId] }));
        }
    }, [urlLayerId]);

    const originalNames = useMemo(() => {
        if (featureServers.status !== AsyncStatus.Success) {
            return [];
        }

        const otherFeatureServers = featureServerId
            ? featureServers.data.filter((c) => c.id !== featureServerId)
            : featureServers.data;
        return otherFeatureServers.map((c) => c.name);
    }, [featureServers, featureServerId]);

    const handleSave: FormEventHandler = (e) => {
        e.preventDefault();
        const configToSave = { ...featureServer };
        if (!useOnlySelectedLayers) {
            delete configToSave.enabledLayerIds;
        }

        if (isNew) {
            dispatch(arcgisActions.addFeatureServer(configToSave));
        } else {
            dispatch(arcgisActions.updateFeatureServer(configToSave));
        }
        history.goBack();
    };

    if (featureServers.status !== AsyncStatus.Success || !featureServer) {
        return null;
    }

    let urlError = "";
    if (urlChanged) {
        const trimmedUrl = featureServer.url.trim();
        if (trimmedUrl === "") {
            urlError = "Can't be empty";
        } else {
            try {
                new URL(featureServer.url);
            } catch {
                urlError = "Invalid URL";
            }
        }
    }

    let nameError = "";
    if (nameChanged) {
        const trimmedName = featureServer.name.trim();
        if (trimmedName === "") {
            nameError = "Can't be empty";
        } else if (originalNames.includes(trimmedName)) {
            nameError = "Already taken";
        }
    }

    const handleUrlChange = (url: string) => {
        const prevUrl = featureServer.url;
        const newConfig = { ...featureServer, url, enabledLayerIds: [] } as FeatureServer;
        if (!newConfig.name) {
            const match = url.match(/services\/(.+)\/FeatureServer/);
            if (match) {
                newConfig.name = match[1];
                setNameChanged(true);
            }
        }
        setUrlChanged(true);

        // One character change could mean that the user is typing and we could debounce
        shouldDebounceLoadingDefinition.current = Math.abs(prevUrl.length - url.length) === 1;

        setFeatureServer(newConfig);
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
                confirmBtnDisabled={Boolean(urlError || nameError || fsDefinition.status !== AsyncStatus.Success)}
                justifyContent="start"
                py={2}
            >
                {!isEditingLayerList ? (
                    <>
                        <TextField
                            sx={{ mb: 3 }}
                            multiline
                            fullWidth
                            minRows={3}
                            maxRows={20}
                            value={featureServer.url}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            error={urlError !== ""}
                            helperText={urlError}
                            label="URL"
                            required
                            InputProps={{
                                endAdornment: fsDefinition.status !== AsyncStatus.Initial && (
                                    <InputAdornment position="end">
                                        {fsDefinition.status === AsyncStatus.Loading && (
                                            <CircularProgress size="1rem" />
                                        )}
                                        {fsDefinition.status === AsyncStatus.Success && <CheckCircle color="success" />}
                                        {fsDefinition.status === AsyncStatus.Error && (
                                            <Tooltip title={fsDefinition.msg}>
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
                            value={featureServer.name}
                            onChange={(e) => {
                                setFeatureServer({ ...featureServer, name: e.target.value });
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
                            value={featureServer.layerWhere}
                            onChange={(e) => setFeatureServer({ ...featureServer, layerWhere: e.target.value })}
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
                                            if (e.target.checked && fsDefinition.status === AsyncStatus.Success) {
                                                setIsEditingLayerList(true);
                                            }
                                        }}
                                    />
                                }
                                label={
                                    <Box mr={0.5} display="flex" gap={2} alignItems="baseline">
                                        <Box>{t("useOnlySelectedLayers")}</Box>
                                        <Button
                                            variant="text"
                                            size="small"
                                            onClick={() => setIsEditingLayerList(true)}
                                            sx={{
                                                display:
                                                    useOnlySelectedLayers && fsDefinition.status === AsyncStatus.Success
                                                        ? "block"
                                                        : "none",
                                            }}
                                        >
                                            {t("selectLayers")}
                                        </Button>
                                    </Box>
                                }
                            />
                        </Box>
                    </>
                ) : fsDefinition.status === AsyncStatus.Success ? (
                    <>
                        <Box mr={0.5} display="flex" justifyContent="space-between" alignItems="baseline" width="100%">
                            <div>{t("selectLayers")}</div>
                            <Button variant="text" size="small" onClick={() => setIsEditingLayerList(false)}>
                                {t("back")}
                            </Button>
                        </Box>
                        <LayerList
                            definition={fsDefinition.data}
                            enabledLayerIds={featureServer.enabledLayerIds}
                            onToggle={(layerId) => {
                                if (featureServer.enabledLayerIds?.includes(layerId)) {
                                    setFeatureServer({
                                        ...featureServer,
                                        enabledLayerIds: featureServer.enabledLayerIds.filter((id) => id !== layerId),
                                    });
                                } else {
                                    setFeatureServer({
                                        ...featureServer,
                                        enabledLayerIds: [...(featureServer.enabledLayerIds || []), layerId].sort(
                                            (a, b) => a - b,
                                        ),
                                    });
                                }
                            }}
                        />
                    </>
                ) : null}

                <Box flex="auto" />
            </Confirmation>
        </>
    );
}

function LayerList({
    definition,
    enabledLayerIds,
    onToggle,
}: {
    definition: FeatureServerDefinition;
    enabledLayerIds: number[] | undefined;
    onToggle: (layerId: number) => void;
}) {
    return (
        <List
            dense
            sx={{
                width: "100%",
                bgcolor: "background.paper",
                position: "relative",
                overflow: "auto",
                mb: 1,
            }}
        >
            {definition.layers.map((layer) => {
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
