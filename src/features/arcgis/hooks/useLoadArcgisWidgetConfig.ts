import { useGetArcgisWidgetConfigQuery } from "apis/dataV2/dataV2Api";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import { arcgisActions, FeatureServer, selectArcgisFeatureServersStatus } from "../arcgisSlice";

export function useLoadArcgisWidgetConfig() {
    const dispatch = useAppDispatch();
    const projectId = useExplorerGlobals(true).state.scene.id;
    const status = useAppSelector(selectArcgisFeatureServersStatus);

    const { data, isFetching, error } = useGetArcgisWidgetConfigQuery(
        { projectId },
        { skip: !projectId || status === AsyncStatus.Success }
    );

    useEffect(() => {
        if (data) {
            const featureServers = data.featureServers.map((config) => {
                return {
                    id: config.id,
                    url: config.url,
                    name: config.name,
                    layerWhere: config.layerWhere,
                    meta: { status: AsyncStatus.Initial },
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
