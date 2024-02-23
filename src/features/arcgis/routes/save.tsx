import { usePutArcgisWidgetConfigMutation } from "apis/dataV2/dataV2Api";
import { FormEvent } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Confirmation } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import {
    arcgisActions,
    ArcgisWidgetConfig,
    FeatureServerState,
    selectArcgisFeatureServers,
    selectArcgisSaveStatus,
} from "../arcgisSlice";

export function Save() {
    const history = useHistory();
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectArcgisSaveStatus);
    const projectId = useExplorerGlobals(true).state.scene.id;
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

function featureServersToConfig(featureServers: FeatureServerState[]): ArcgisWidgetConfig {
    return { featureServers: featureServers.map((fs) => fs.config) };
}
