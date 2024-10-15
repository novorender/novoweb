import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { explorerActions, selectNewDesignRaw } from "slices/explorer";

import { newDesignLocalStorageKey } from "./utils";

export function useToggleNewDesign() {
    const dispatch = useAppDispatch();
    const newDesign = useAppSelector(selectNewDesignRaw);

    return useCallback(() => {
        dispatch(explorerActions.setNewDesign(!newDesign));
        localStorage.setItem(newDesignLocalStorageKey, `${!newDesign}`);
    }, [dispatch, newDesign]);
}
