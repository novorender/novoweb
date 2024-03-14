import { useGetArcgisWidgetConfigQuery } from "apis/dataV2/dataV2Api";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import { arcgisActions, FeatureServer, selectArcgisFeatureServersStatus } from "../arcgisSlice";

export function useLoadArcgisWidgetConfig() {
    const dispatch = useAppDispatch();
    const projectId = useExplorerGlobals(true).state.scene.id;
    const status = useAppSelector(selectArcgisFeatureServersStatus);
    const isProjectV2 = useAppSelector(selectProjectIsV2);

    const { data, isFetching, error } = useGetArcgisWidgetConfigQuery(
        { projectId },
        { skip: !projectId || status === AsyncStatus.Success || !isProjectV2 }
    );

    useEffect(() => {
        if (!isProjectV2) {
            dispatch(
                arcgisActions.setFeatureServers({
                    status: AsyncStatus.Error,
                    msg: "Feature is not supported for the current project, please contact support",
                })
            );
        }
    }, [dispatch, isProjectV2]);

    useEffect(() => {
        if (data) {
            const featureServers = data.featureServers.map((fs) => {
                return {
                    id: fs.id,
                    url: fs.url,
                    name: fs.name,
                    layerWhere: fs.layerWhere,
                    definition: { status: AsyncStatus.Initial },
                    savedLayers: fs.layers,
                    enabledLayerIds: fs.enabledLayerIds,
                    layers: [],
                } as FeatureServer;
            });
            dispatch(arcgisActions.setFeatureServers({ status: AsyncStatus.Success, data: featureServers }));
        }
    }, [dispatch, data]);

    useEffect(() => {
        if (isFetching) {
            dispatch(arcgisActions.setFeatureServers({ status: AsyncStatus.Loading }));
        }
    }, [dispatch, isFetching]);

    useEffect(() => {
        if (error) {
            dispatch(
                arcgisActions.setFeatureServers({
                    status: AsyncStatus.Error,
                    msg: "Error loading widget configuration",
                })
            );
        }
    }, [dispatch, error]);
}
