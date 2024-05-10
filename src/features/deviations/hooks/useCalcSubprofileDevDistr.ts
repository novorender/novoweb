import { useEffect, useMemo } from "react";

import { useCalcDeviationDistributionsMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import {
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfile,
    selectSelectedSubprofile,
} from "../selectors";
import { sortColorStops } from "../utils";

export function useCalcSubprofileDevDistr() {
    const projectId = useSceneId();
    const profile = useAppSelector(selectSelectedProfile);
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const distrs = useAppSelector(selectCurrentSubprofileDeviationDistributions);
    const [calc] = useCalcDeviationDistributionsMutation();
    const dispatch = useAppDispatch();

    const parameterBounds = useMemo(() => {
        if (!subprofile?.centerLine) {
            return;
        }

        return distrs?.parameterBounds ?? subprofile.centerLine?.parameterBounds;
    }, [subprofile, distrs]);

    useEffect(() => {
        calcDistributions();

        async function calcDistributions() {
            if (
                !projectId ||
                !profile ||
                !subprofile?.centerLine ||
                !parameterBounds ||
                (distrs && distrs.points.status !== AsyncStatus.Initial)
            ) {
                return;
            }

            dispatch(
                deviationsActions.setSubprofileDeviationDistributions({
                    parameterBounds,
                    points: { status: AsyncStatus.Loading },
                })
            );

            try {
                const result = await calc({
                    projectId,
                    profileId: profile.id,
                    config: {
                        centerLine: subprofile?.centerLine.brepId,
                        absoluteValues: profile.colors.absoluteValues,
                        distances: sortColorStops(profile.colors.colorStops.slice(), profile.colors.absoluteValues).map(
                            (cs) => cs.position
                        ),
                        start: parameterBounds[0],
                        end: parameterBounds[1],
                    },
                }).unwrap();

                dispatch(
                    deviationsActions.setSubprofileDeviationDistributions({
                        parameterBounds,
                        points: { status: AsyncStatus.Success, data: result },
                    })
                );
            } catch (ex) {
                console.warn("Error calculationg deviation distributions", ex);
                dispatch(
                    deviationsActions.setSubprofileDeviationDistributions({
                        parameterBounds,
                        points: { status: AsyncStatus.Error, msg: "Error calculation distributions" },
                    })
                );
            }
        }
    }, [dispatch, distrs, projectId, profile, subprofile, calc, parameterBounds]);
}
