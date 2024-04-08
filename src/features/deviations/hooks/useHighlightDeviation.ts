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

import { selectDeviationLegendGroups, selectSelectedCenterLineFollowPathId } from "../deviationsSlice";

export function useHighlightDeviation() {
    const legendGroups = useAppSelector(selectDeviationLegendGroups);
    const followPathId = useAppSelector(selectSelectedCenterLineFollowPathId);
    const objectGroups = useObjectGroups();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchObjectGroups = useDispatchObjectGroups();

    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const originalDefaultVisibility = useRef(defaultVisibility);
    const installed = useRef(false);

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
        if (!legendGroups?.length) {
            restore();
            return;
        }

        const ids = new Set<number>();
        for (const fav of legendGroups) {
            if (fav.status !== GroupStatus.Hidden && !fav.usesGroupColor) {
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

        let modifiedGroups = false;
        const newObjectGroups = objectGroups.map((group) => {
            const fav = legendGroups.find((g) => g.id === group.id);
            if (!fav || !fav.usesGroupColor) {
                return group;
            } else if (group.status !== fav.status) {
                modifiedGroups = true;
                return { ...group, status: fav.status };
            }

            return group;
        });

        if (modifiedGroups) {
            dispatchObjectGroups(objectGroupsActions.set(newObjectGroups));
        }

        installed.current = true;
    }, [
        dispatch,
        dispatchHighlightCollections,
        dispatchHighlighted,
        dispatchObjectGroups,
        objectGroups,
        legendGroups,
        restore,
        followPathId,
    ]);
}
