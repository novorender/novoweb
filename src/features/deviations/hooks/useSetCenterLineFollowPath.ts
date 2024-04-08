import { DuoMeasurementValues } from "@novorender/api";
import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
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
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const selectedCenterLineId = useAppSelector(selectSelectedCenterLineId);
    const centerLine =
        selectedProfile && selectedCenterLineId
            ? selectedProfile.subprofiles.find((sp) => sp.centerLine?.brepId === selectedCenterLineId)?.centerLine
            : undefined;
    const followPathId = centerLine?.objectId;
    const dispatchHighlighted = useDispatchHighlighted();
    const installedFollowPathId = useRef<number>();

    const restore = useCallback(() => {
        if (installedFollowPathId.current !== undefined) {
            dispatch(renderActions.setViewMode(ViewMode.Default));
            dispatch(followPathActions.setSelectedPath(undefined));
            dispatch(followPathActions.setSelectedIds([]));
            dispatch(followPathActions.setProfileRange(undefined));
            dispatch(measureActions.setSelectedEntities([]));
            dispatchHighlighted(highlightActions.remove([installedFollowPathId.current]));

            installedFollowPathId.current = undefined;
        }
    }, [dispatch, dispatchHighlighted]);

    useEffect(() => {
        return restore;
    }, [restore]);

    useEffect(() => {
        setFollowPath();

        async function setFollowPath() {
            if (!followPathId || !centerLine || !view) {
                restore();
                return;
            }

            installedFollowPathId.current = undefined;

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
                            const pos = Math.max(
                                centerLine.parameterBounds[0],
                                Math.min(centerLine.parameterBounds[1], duoMeasure.measureInfoB.parameter)
                            );
                            dispatch(followPathActions.setProfile(pos.toFixed(3)));
                            initPos = false;
                        }
                    } else {
                        dispatch(followPathActions.setProfile(centerLine.parameterBounds[0].toFixed(3)));
                    }
                    dispatch(measureActions.setSelectedEntities([segment]));
                    dispatch(measureActions.pin(0));
                }
            }
            dispatch(followPathActions.setReset(initPos ? "initPosition" : "default"));

            installedFollowPathId.current = followPathId;
        }
    }, [view, followPathId, dispatch, dispatchHighlighted, centerLine, restore]);
}
