import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, useObjectGroups } from "contexts/objectGroups";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "features/render";

import { selectDeviationGroups, selectSelectedCenterLineFollowPathId } from "../deviationsSlice";

export function useHighlightDeviation() {
    const favGroups = useAppSelector(selectDeviationGroups);
    const followPathId = useAppSelector(selectSelectedCenterLineFollowPathId);
    const objectGroups = useObjectGroups();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

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
        if (!favGroups?.length) {
            restore();
            return;
        }

        const ids = new Set<number>();
        for (const fav of favGroups) {
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
    }, [dispatch, dispatchHighlightCollections, dispatchHighlighted, objectGroups, favGroups, restore, followPathId]);
}
