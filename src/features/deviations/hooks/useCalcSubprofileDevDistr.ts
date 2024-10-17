import { useEffect, useMemo } from "react";

import { useLazyGetDeviationDistributionQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";
import { getMinMax } from "utils/math";

import { deviationsActions } from "../deviationsSlice";
import {
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfileId,
    selectSelectedSubprofile,
} from "../selectors";

export function useCalcSubprofileDevDistr({ skip = false }: { skip?: boolean } = {}) {
    const projectId = useSceneId();
    const profileId = useAppSelector(selectSelectedProfileId);
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const distrs = useAppSelector(selectCurrentSubprofileDeviationDistributions);
    const dispatch = useAppDispatch();
    const [calc] = useLazyGetDeviationDistributionQuery();

    const parameterBounds = useMemo(() => {
        if (!subprofile?.centerLine) {
            return;
        }

        return distrs?.parameterBounds ?? subprofile.centerLine?.parameterBounds;
    }, [subprofile, distrs]);

    useEffect(() => {}, []);

    useEffect(() => {
        calcDistributions();

        async function calcDistributions() {
            if (
                skip ||
                !projectId ||
                !profileId ||
                !subprofile?.centerLine ||
                !parameterBounds ||
                (distrs && distrs.data.status !== AsyncStatus.Initial)
            ) {
                return;
            }

            const isFirstRequest = !distrs;

            dispatch(
                deviationsActions.setSubprofileDeviationDistributions({
                    ...distrs,
                    parameterBounds,
                    data: { status: AsyncStatus.Loading },
                }),
            );

            try {
                const result = await calc(
                    {
                        projectId,
                        profileId: profileId,
                        centerLineId: subprofile.centerLine.brepId,
                        start: parameterBounds[0],
                        end: parameterBounds[1],
                    },
                    true,
                ).unwrap();

                let newParameterBounds = parameterBounds;
                if (isFirstRequest && result.aggregatesAlongProfile.length > 0) {
                    // When doing a first request (with full parameter bounds) - set initial parameter bounds
                    // based on effective profile
                    newParameterBounds = getMinMax(result.aggregatesAlongProfile, (p) => p.profile);
                }

                dispatch(
                    deviationsActions.updateSubprofileDeviationDistributions({
                        parameterBounds: newParameterBounds,
                        data: { status: AsyncStatus.Success, data: result },
                        ...(isFirstRequest
                            ? {
                                  fullEffectiveParameterBounds: newParameterBounds,
                                  fullData: result,
                              }
                            : {}),
                    }),
                );
            } catch (ex) {
                console.warn("Error calculationg deviation distributions", ex);
                dispatch(
                    deviationsActions.updateSubprofileDeviationDistributions({
                        parameterBounds,
                        data: { status: AsyncStatus.Error, msg: "Error calculation distributions" },
                    }),
                );
            }
        }
    }, [dispatch, distrs, projectId, profileId, subprofile, calc, parameterBounds, skip]);
}
