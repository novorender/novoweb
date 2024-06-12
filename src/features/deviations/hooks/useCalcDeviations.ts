import { useCallback } from "react";

import { dataApi } from "apis/dataV1";
import { useCalcDeviationsMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { isInternalGroup, useObjectGroups } from "contexts/objectGroups";
import { useSceneId } from "hooks/useSceneId";
import { selectProjectIsV2 } from "slices/explorer";

import { deviationsActions } from "..";
import { DeviationCalculationStatus, UiDeviationConfig } from "../deviationTypes";
import { uiConfigToServerConfig } from "../utils";
import { updateObjectIds } from "./useSaveDeviationConfig";

export function useCalcDeviations() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const [calcDeviations] = useCalcDeviationsMutation();
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const sceneId = useSceneId();

    return useCallback(
        async (config: UiDeviationConfig) => {
            dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));

            try {
                let success = false;
                if (isProjectV2) {
                    const serverConfig = uiConfigToServerConfig(await updateObjectIds(sceneId, config, objectGroups));
                    serverConfig.rebuildRequired = true;
                    await calcDeviations({ projectId: scene.id, config: serverConfig }).unwrap();

                    success = true;
                } else {
                    const res = await dataApi.fetch(`deviations/${scene.id}`).then((r) => r.json());

                    if (!res.success) {
                        dispatch(
                            deviationsActions.setCalculationStatus({
                                status: DeviationCalculationStatus.Error,
                                error: res.error ?? "Unknown error calculating deviations",
                            })
                        );
                    }
                }

                if (success) {
                    dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
                }
            } catch (ex) {
                console.warn(ex);
                dispatch(
                    deviationsActions.setCalculationStatus({
                        status: DeviationCalculationStatus.Error,
                        error: "Unknown error calculating deviations",
                    })
                );
            }
        },
        [dispatch, sceneId, scene, isProjectV2, calcDeviations, objectGroups]
    );
}
