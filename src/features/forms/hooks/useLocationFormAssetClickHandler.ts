import { PickSampleExt } from "@novorender/api";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { useFormsGlobals } from "../formsGlobals";
import { formsActions, selectSelectedFormId } from "../slice";

export function useLocationFormAssetClickHandler() {
    const {
        state: { objectIdToFormIdMap },
    } = useFormsGlobals();
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const dispatch = useAppDispatch();

    return useCallback(
        (result: PickSampleExt) => {
            const formId = objectIdToFormIdMap.get(result.objectId);

            if (!formId) {
                return false;
            }

            dispatch(formsActions.setSelectedFormId(selectedFormId === formId ? undefined : formId));

            return true;
        },
        [dispatch, objectIdToFormIdMap, selectedFormId]
    );
}
