import { FormEventHandler, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Confirmation, TextField } from "components";
import { AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisWidgetConfig } from "../arcgisSlice";
import { trimRightSlash } from "../utils";

export function EditFeatureServer() {
    const history = useHistory();
    const dispatch = useAppDispatch();
    const url = useLocation<{ url?: string }>().state?.url;
    const isNew = url === undefined;
    const originalConfig = useAppSelector(selectArcgisWidgetConfig);
    const originalFeatureServerConfig =
        originalConfig.status === AsyncStatus.Success
            ? originalConfig.data.featureServers.find((c) => c.url === url)!
            : null;

    const [config, setConfig] = useState(originalFeatureServerConfig ?? { url: "", name: "" });
    const [urlChanged, setUrlChanged] = useState(false);
    const [nameChanged, setNameChanged] = useState(false);

    const [originalUrls, originalNames] = useMemo(() => {
        if (originalConfig.status !== AsyncStatus.Success) {
            return [[], []];
        }

        const featureServers = url
            ? originalConfig.data.featureServers.filter((c) => c.url !== url)
            : originalConfig.data.featureServers;
        return [featureServers.map((c) => trimRightSlash(c.url)), featureServers.map((c) => c.name)];
    }, [originalConfig, url]);

    const handleSave: FormEventHandler = (e) => {
        e.preventDefault();

        if (url) {
            dispatch(arcgisActions.updateFeatureServerConfig({ from: originalFeatureServerConfig!, to: config }));
        } else {
            dispatch(arcgisActions.addFeatureServerConfig(config));
        }
        history.goBack();
    };

    if (originalConfig.status !== AsyncStatus.Success || !config) {
        return null;
    }

    let urlError = "";
    if (urlChanged) {
        const trimmedUrl = config.url.trim();
        if (trimmedUrl === "") {
            urlError = "Can't be empty";
        } else if (originalUrls.includes(trimmedUrl)) {
            urlError = "Already added";
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

    function setUrl(url: string) {
        const newConfig = { ...config, url };
        if (!newConfig.name) {
            const match = url.match(/services\/(.+)\/FeatureServer/);
            if (match) {
                newConfig.name = match[1];
                setNameChanged(true);
            }
        }
        setUrlChanged(true);
        setConfig(newConfig);
    }

    function setName(name: string) {
        setConfig({ ...config, name });
        setNameChanged(true);
    }

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
                confirmBtnDisabled={Boolean(urlError || nameError)}
            >
                <TextField
                    sx={{ mb: 3 }}
                    multiline
                    fullWidth
                    minRows={3}
                    maxRows={20}
                    value={config.url}
                    onChange={(e) => setUrl(e.target.value)}
                    error={urlError !== ""}
                    helperText={urlError}
                    label="URL"
                    required
                />
                <TextField
                    sx={{ mb: 3 }}
                    fullWidth
                    value={config.name}
                    onChange={(e) => setName(e.target.value)}
                    error={nameError !== ""}
                    helperText={nameError}
                    label="Name"
                    required
                />
            </Confirmation>
        </>
    );
}
