import { useGetArcgisWidgetConfigQuery } from "apis/dataV2/dataV2Api";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisWidgetConfig } from "../arcgisSlice";

export function useLoadArcgisWidgetConfig() {
    const dispatch = useAppDispatch();
    const projectId = useExplorerGlobals(true).state.scene.id;
    const config = useAppSelector(selectArcgisWidgetConfig);

    const { data, isFetching, error } = useGetArcgisWidgetConfigQuery(
        { projectId },
        { skip: !projectId || config.status === AsyncStatus.Success }
    );

    useEffect(() => {
        if (data) {
            dispatch(arcgisActions.setConfig({ status: AsyncStatus.Success, data }));
        }
    }, [dispatch, data]);

    useEffect(() => {
        if (isFetching) {
            dispatch(arcgisActions.setConfig({ status: AsyncStatus.Loading }));
        }
    }, [dispatch, isFetching]);

    useEffect(() => {
        if (error) {
            dispatch(arcgisActions.setConfig({ status: AsyncStatus.Error, msg: "Error loading widget configuration" }));
        }
    }, [dispatch, error]);
}
