import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { ObjectVisibility, renderActions, selectDefaultVisibility, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";

import { selectDeviationLegendGroups, selectSelectedCenterLineFollowPathId, selectSelectedProfile } from "../selectors";

export function useHighlightDeviation() {
    const legendGroups = useAppSelector(selectDeviationLegendGroups);
    const followPathId = useAppSelector(selectSelectedCenterLineFollowPathId);
    const objectGroups = useObjectGroups();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const deviationType = useAppSelector(selectSelectedProfile)?.deviationType;
    const active = useAppSelector(selectViewMode) === ViewMode.Deviations;

    const objectGroupsRef = useRef(objectGroups);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const originalDefaultVisibility = useRef(defaultVisibility);
    const installed = useRef(false);

    useEffect(() => {
        objectGroupsRef.current = objectGroups;
    }, [objectGroups]);

    const restore = useCallback(() => {
        if (installed.current) {
            dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.SelectedDeviation, []));
            dispatch(renderActions.setDefaultVisibility(originalDefaultVisibility.current));
            installed.current = false;
        }
    }, [dispatchHighlightCollections, dispatch]);

    useEffect(() => {
        return restore;
    }, [restore]);

    // Update SelectedDeviation highlight collection with deviation-colored groups
    useEffect(() => {
        if (!legendGroups?.length || !active) {
            restore();
            return;
        }

        const ids = new Set<number>();
        for (const fav of legendGroups) {
            if (fav.isDeviationColored && fav.status !== GroupStatus.Hidden) {
                const group = objectGroups.find((g) => g.id === fav.id);
                if (group) {
                    for (const id of group.ids) {
                        ids.add(id);
                    }
                }
            }
        }
        if (followPathId) {
            ids.add(followPathId);
        }

        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.SelectedDeviation, [...ids])
        );
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

        installed.current = true;
    }, [
        dispatch,
        dispatchHighlightCollections,
        dispatchHighlighted,
        legendGroups,
        restore,
        followPathId,
        objectGroups,
        active,
    ]);

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
