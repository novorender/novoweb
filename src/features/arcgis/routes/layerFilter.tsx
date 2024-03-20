import { FormEventHandler, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app";
import { Confirmation, TextField } from "components";
import { AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";

export function LayerFilter() {
    const history = useHistory();
    const dispatch = useAppDispatch();
    const urlState = useLocation<{ featureServerId: string; layerId: string }>().state;
    const featureServerId = urlState.featureServerId;
    const layerId = Number(urlState.layerId);
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const featureServer = (
        featureServers.status === AsyncStatus.Success
            ? featureServers.data.find((fs) => fs.id === featureServerId)
            : undefined
    )!;

    const layer = featureServer.layers.find((l) => l.id === layerId)!;

    const [where, setWhere] = useState(layer.where || "");

    const handleSave: FormEventHandler = (e) => {
        e.preventDefault();
        dispatch(arcgisActions.setLayerFilter({ featureServerId: featureServer.id, layerId, where }));
        history.goBack();
    };

    const whereError = "";

    return (
        <>
            <Confirmation
                title="Layer filter"
                confirmBtnText="Save"
                onCancel={() => {
                    history.goBack();
                }}
                component="form"
                onSubmit={handleSave}
                confirmBtnDisabled={whereError !== ""}
            >
                <TextField
                    sx={{ mb: 3 }}
                    multiline
                    fullWidth
                    minRows={5}
                    maxRows={20}
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    error={whereError !== ""}
                    helperText={whereError}
                    label="Where"
                />
            </Confirmation>
        </>
    );
}
