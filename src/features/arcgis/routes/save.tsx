import { FormEvent } from "react";
import { useHistory } from "react-router-dom";

import { usePutArcgisWidgetConfigMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { ArcgisWidgetConfig } from "..";
import { arcgisActions, selectArcgisFeatureServers, selectArcgisSaveStatus } from "../arcgisSlice";
import { FeatureServer, FeatureServerConfig, LayerConfig } from "../types";

export function Save() {
    const history = useHistory();
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectArcgisSaveStatus);
    const projectId = useSceneId();
    const featureServers = useAppSelector(selectArcgisFeatureServers);

    const [save] = usePutArcgisWidgetConfigMutation();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();

        if (featureServers.status !== AsyncStatus.Success) {
            return;
        }

        dispatch(arcgisActions.setSaveStatus(AsyncStatus.Loading));

        const result = await save({ projectId, config: featureServersToConfig(featureServers.data) });

        if ("error" in result) {
            console.error(result.error);
            dispatch(arcgisActions.setSaveStatus(AsyncStatus.Error));
        } else {
            dispatch(arcgisActions.setSaveStatus(AsyncStatus.Success));
        }

        history.push("/");
    };

    return (
        <>
            <Confirmation
                title="Save configuration?"
                confirmBtnText="Save"
                onCancel={() => history.goBack()}
                component="form"
                onSubmit={handleSave}
                loading={saveStatus === AsyncStatus.Loading}
            />
        </>
    );
}

function featureServersToConfig(featureServers: FeatureServer[]): ArcgisWidgetConfig {
    return {
        featureServers: featureServers.map((fs) => {
            const layers: { [layerId: number]: LayerConfig } = {};

            for (const layer of fs.layers) {
                if (layer.checked || layer.where) {
                    layers[layer.id] = {
                        checked: layer.checked,
                        where: layer.where,
                    };
                }
            }

            return {
                id: fs.id,
                url: fs.url,
                name: fs.name,
                enabledLayerIds: fs.enabledLayerIds,
                layerWhere: fs.layerWhere,
                layers,
            } as FeatureServerConfig;
        }),
    };
}
