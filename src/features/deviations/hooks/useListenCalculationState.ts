import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect } from "react";

import { useGetProjectProgressQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectIsAdminScene, selectProjectIsV2 } from "slices/explorer";

import { deviationsActions } from "../deviationsSlice";
import { DeviationCalculationStatus } from "../deviationTypes";

export function useListenCalculationState() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const projectId = view?.renderState.scene?.config.id;
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const dispatch = useAppDispatch();

    // Project v2
    const {
        data: progress,
        isLoading,
        isError,
    } = useGetProjectProgressQuery(isAdminScene && projectId && isProjectV2 ? { projectId } : skipToken, {
        pollingInterval: 60000,
    });

    useEffect(() => {
        if (progress) {
            const status = progress.complete ? DeviationCalculationStatus.Inactive : DeviationCalculationStatus.Running;
            dispatch(deviationsActions.setCalculationStatus({ status }));
        }
    }, [dispatch, progress]);

    useEffect(() => {
        if (isLoading) {
            dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Loading }));
        }
    }, [dispatch, isLoading]);

    useEffect(() => {
        if (isError) {
            dispatch(
                deviationsActions.setCalculationStatus({
                    status: DeviationCalculationStatus.Error,
                    error: "Failed to fetch calculation status",
                })
            );
        }
    }, [dispatch, isError]);
}
