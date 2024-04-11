import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "features/render";

import {
    selectActive,
    selectDeviationLegendGroups,
    selectSelectedCenterLineFollowPathId,
    selectSelectedSubprofile,
} from "../deviationsSlice";

export function useHighlightDeviation() {
    const legendGroups = useAppSelector(selectDeviationLegendGroups);
    const followPathId = useAppSelector(selectSelectedCenterLineFollowPathId);
    const objectGroups = useObjectGroups();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const active = useAppSelector(selectActive);

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

    useEffect(() => {
        if (!legendGroups?.length || !active) {
            restore();
            return;
        }

        const ids = new Set<number>();
        for (const fav of legendGroups) {
            if (fav.status !== GroupStatus.Hidden) {
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

    useEffect(() => {
        if (!subprofile?.to || !active) {
            return;
        }

        const ids = new Set(
            [...subprofile.to.groupIds, ...subprofile.favorites].filter((id) => !subprofile.from.groupIds.includes(id))
        );
        const objectGroups = objectGroupsRef.current.map((group) => {
            if (ids.has(group.id)) {
                return { ...group, status: GroupStatus.Selected };
            } else if (group.status === GroupStatus.Selected) {
                return { ...group, status: GroupStatus.None };
            } else {
                return group;
            }
        });

        dispatchObjectGroups(objectGroupsActions.set(objectGroups));
    }, [dispatchObjectGroups, subprofile?.from, subprofile?.to, subprofile?.favorites, active]);
}
