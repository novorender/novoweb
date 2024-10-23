import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { ObjectVisibility, renderActions, selectDefaultVisibility, selectViewMode } from "features/render";
import { useFillGroupIds } from "hooks/useFillGroupIds";
import { ViewMode } from "types/misc";

import { selectAllDeviationGroups, selectSelectedCenterLineFollowPathId, selectSelectedProfile } from "../selectors";

export function useHighlightDeviation() {
    const legendGroups = useAppSelector(selectAllDeviationGroups);
    const followPathId = useAppSelector(selectSelectedCenterLineFollowPathId);
    const objectGroups = useObjectGroups();
    const dispatch = useAppDispatch();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const deviationType = useAppSelector(selectSelectedProfile)?.deviationType;
    const viewMode = useAppSelector(selectViewMode);
    const active = viewMode === ViewMode.Deviations;
    const fillGroupIds = useFillGroupIds();

    const objectGroupsRef = useRef(objectGroups);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const originalDefaultVisibility = useRef(defaultVisibility);
    const installed = useRef(false);

    useEffect(() => {
        objectGroupsRef.current = objectGroups;
    }, [objectGroups]);

    const restore = useCallback(() => {
        if (installed.current) {
            dispatch(renderActions.setDefaultVisibility(originalDefaultVisibility.current));
            installed.current = false;
        }
    }, [dispatch]);

    useEffect(() => {
        return restore;
    }, [restore]);

    // Update SelectedDeviation highlight collection with deviation-colored groups
    useEffect(() => {
        highlight();

        async function highlight() {
            if (!legendGroups?.length || !active) {
                restore();
                return;
            }

            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

            installed.current = true;
        }
    }, [dispatch, legendGroups, restore, followPathId, objectGroups, active, fillGroupIds]);

    // Sync non deviation-colored groups with objectGroups
    useEffect(() => {
        if (!active) {
            return;
        }

        const otherGroups = legendGroups.filter((g) => !g.isDeviationColored);

        const objectGroups = objectGroupsRef.current.map((group) => {
            const g = otherGroups.find((g2) => g2.id === group.id)!;
            if (g) {
                if (group.status !== g.status) {
                    return { ...group, status: g.status };
                }
            } else if (group.status === GroupStatus.Selected) {
                return { ...group, status: GroupStatus.None };
            }
            return group;
        });

        dispatchObjectGroups(objectGroupsActions.set(objectGroups));
    }, [dispatchObjectGroups, legendGroups, active, deviationType]);
}
