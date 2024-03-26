import { useCallback, useEffect, useRef } from "react";

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
            if (!followPathId || !centerLine) {
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
            dispatch(followPathActions.setProfile(centerLine.parameterBounds[0].toFixed(3)));
            dispatch(followPathActions.setReset("initPosition"));

            installedFollowPathId.current = followPathId;
        }
    }, [view, followPathId, dispatch, dispatchHighlighted, centerLine, restore]);
}
