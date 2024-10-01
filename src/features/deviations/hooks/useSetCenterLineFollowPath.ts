import { DuoMeasurementValues } from "@novorender/api";
import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { followPathActions, selectView2d } from "features/followPath/followPathSlice";
import { useGoToProfile } from "features/followPath/useGoToProfile";
import { measureActions } from "features/measure";
import { renderActions, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";

import { selectSelectedCenterLineId, selectSelectedProfile } from "../selectors";

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
    const active = useAppSelector(selectViewMode) === ViewMode.Deviations;

    const goToProfile = useGoToProfile();
    const goToProfileRef = useRef(goToProfile);
    useEffect(() => {
        goToProfileRef.current = goToProfile;
    });

    const view2d = useAppSelector(selectView2d);
    const view2dRef = useRef(view2d);
    useEffect(() => {
        view2dRef.current = view2d;
    });

    const restore = useCallback(() => {
        if (installedFollowPathId.current !== undefined) {
            // dispatch(renderActions.setViewMode(ViewMode.Default));
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
            if (!followPathId || !centerLine || !view || !active) {
                restore();
                return;
            }

            installedFollowPathId.current = undefined;

            dispatch(renderActions.setViewMode(ViewMode.Deviations));
            dispatch(followPathActions.setSelectedPath(followPathId));
            dispatch(followPathActions.setSelectedIds([followPathId]));
            dispatch(followPathActions.setRoadIds(undefined));
            dispatch(followPathActions.setDrawRoadIds(undefined));
            dispatch(
                followPathActions.setProfileRange({
                    min: centerLine.parameterBounds[0],
                    max: centerLine.parameterBounds[1],
                }),
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
                            const pos = Math.max(
                                centerLine.parameterBounds[0],
                                Math.min(centerLine.parameterBounds[1], duoMeasure.measureInfoB.parameter),
                            );
                            dispatch(followPathActions.setProfile(pos.toFixed(3)));
                            initPos = false;

                            if (view2dRef.current) {
                                const fpObj = await view.measure?.followPath.followParametricObjects([followPathId], {
                                    cylinderMeasure: "center",
                                });

                                if (fpObj) {
                                    goToProfileRef.current({
                                        fpObj: fpObj,
                                        p: pos,
                                        newView2d: true,
                                        keepOffset: false,
                                    });
                                }
                            }
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
    }, [view, followPathId, dispatch, dispatchHighlighted, centerLine, restore, active]);
}
