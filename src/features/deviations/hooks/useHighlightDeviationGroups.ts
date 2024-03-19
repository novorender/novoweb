import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "features/render";

import { selectDeviationGroups, selectSelectedProfileId } from "../deviationsSlice";

export function useHighlightDeviationGroups() {
    const profileId = useAppSelector(selectSelectedProfileId);
    const dispatch = useAppDispatch();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const objectGroups = useObjectGroups();
    const deviationGroups = useAppSelector(selectDeviationGroups);
    const dispatchHighlighted = useDispatchHighlighted();

    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const originalDefaultVisibility = useRef(defaultVisibility);
    const modifiedView = useRef(false);
    const prevProfileId = useRef<typeof profileId>();
    const prevDeviationGroups = useRef<typeof deviationGroups>();
    const willUnmount = useRef(false);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    const restore = useCallback(() => {
        if (modifiedView.current) {
            dispatchHighlighted(highlightActions.setIds([]));

            dispatch(renderActions.setDefaultVisibility(originalDefaultVisibility.current));
            modifiedView.current = false;
            prevProfileId.current = undefined;
            prevDeviationGroups.current = undefined;
        }
    }, [dispatchHighlighted, dispatch]);

    useEffect(() => {
        if (profileId === prevProfileId.current && deviationGroups === prevDeviationGroups.current) {
            return;
        }

        if (!deviationGroups.length) {
            restore();
        } else {
            const ids = new Set<number>();
            for (const group of objectGroups) {
                const devGroup = deviationGroups.find((g) => g.id === group.id);
                if (devGroup && devGroup.status !== GroupStatus.Hidden) {
                    group.ids.forEach((id) => ids.add(id));
                }
            }
            dispatchHighlighted(highlightActions.setIds([...ids]));

            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            modifiedView.current = true;
        }

        prevProfileId.current = profileId;
        prevDeviationGroups.current = deviationGroups;
    }, [dispatchHighlighted, dispatch, profileId, objectGroups, restore, deviationGroups]);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                restore();
            }
        };
    }, [dispatchObjectGroups, dispatch, restore]);
}
