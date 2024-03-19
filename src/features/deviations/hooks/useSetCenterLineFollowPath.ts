import { DuoMeasurementValues } from "@novorender/api";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { followPathActions } from "features/followPath";
import { measureActions } from "features/measure";
import { renderActions } from "features/render";
import { ViewMode } from "types/misc";

import { selectSelectedCenterLineId, selectSelectedProfile } from "../deviationsSlice";

export function useSetCenterLineFollowPath() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const selectedCenterLineId = useAppSelector(selectSelectedCenterLineId);
    const centerLine =
        selectedProfile && selectedCenterLineId
            ? selectedProfile.subprofiles.find((sp) => sp.centerLine?.brepId === selectedCenterLineId)?.centerLine
            : undefined;
    const followPathId = centerLine?.objectId;
    const dispatchHighlighted = useDispatchHighlighted();

    useEffect(() => {
        setFollowPath();

        async function setFollowPath() {
            if (!followPathId || !centerLine) {
                return;
            }

            dispatch(renderActions.setViewMode(ViewMode.FollowPath));
            dispatch(followPathActions.setSelectedPath(followPathId));
            dispatch(followPathActions.setSelectedIds([followPathId]));
            dispatch(followPathActions.setRoadIds(undefined));
            dispatch(followPathActions.setDrawRoadIds(undefined));
            dispatch(
                followPathActions.setProfileRange({
                    min: centerLine.parameterBounds[0],
                    max: centerLine.parameterBounds[1],
                })
            );
            dispatch(renderActions.setMainObject(followPathId));
            dispatchHighlighted(highlightActions.setIds([followPathId]));
            let initPos = true;
            if (view.measure) {
                const segment = await view.measure.core.pickCurveSegment(followPathId);
                if (segment) {
                    const measure = await view.measure.core.measure(segment, {
                        drawKind: "vertex",
                        ObjectId: -1,
                        parameter: view.renderState.camera.position,
                    });
                    if (measure) {
                        const duoMeasure = measure as DuoMeasurementValues;
                        if (duoMeasure.measureInfoB && typeof duoMeasure.measureInfoB.parameter === "number") {
                            // dispatch(followPathActions.setProfile(duoMeasure.measureInfoB.parameter.toFixed(3)));
                            dispatch(followPathActions.setProfile(centerLine.parameterBounds[0].toFixed(3)));
                            initPos = false;
                        }
                    }
                    dispatch(measureActions.setSelectedEntities([segment]));
                    dispatch(measureActions.pin(0));
                }
            }
            dispatch(followPathActions.setReset(initPos ? "initPosition" : "default"));
        }
    }, [view, followPathId, dispatch, dispatchHighlighted, centerLine]);
}
