import { FormEventHandler, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Confirmation, TextField } from "components";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";

export function LayerFilter() {
    const history = useHistory();
    const dispatch = useAppDispatch();
    const urlState = useLocation<{ url: string; layerId: string }>().state;
    const url = urlState.url;
    const layerId = Number(urlState.layerId);
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const featureServer = featureServers.find((fs) => fs.url === url)!;
    const layer = featureServer.layers.find((l) => l.meta.id === layerId)!;

    const [where, setWhere] = useState(layer.where || "");

    const handleSave: FormEventHandler = (e) => {
        e.preventDefault();
        dispatch(arcgisActions.setLayerFilter({ url, layerId, where }));
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
