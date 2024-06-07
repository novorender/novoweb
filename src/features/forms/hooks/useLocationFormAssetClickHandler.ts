import { PickSampleExt } from "@novorender/api";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";

import { useLazyFormsGlobals } from "../formsGlobals/hooks";
import { formsActions, selectCurrentFormsList, selectSelectedFormId } from "../slice";

export function useLocationFormAssetClickHandler() {
    const lazyFormsGlobals = useLazyFormsGlobals();
    const selectedTemplateId = useAppSelector(selectCurrentFormsList);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const dispatch = useAppDispatch();

    return useCallback(
        (result: PickSampleExt) => {
            const ids = lazyFormsGlobals.current.objectIdToFormIdMap.get(result.objectId);

            if (!ids) {
                return false;
            }

            const { templateId, formId } = ids;
            const isSelected = templateId && formId && selectedTemplateId === templateId && selectedFormId === formId;

            if (!isSelected) {
                dispatch(formsActions.setCurrentFormsList(templateId));
            }
            dispatch(formsActions.setSelectedFormId(isSelected ? undefined : formId));

            return true;
        },
        [dispatch, lazyFormsGlobals, selectedTemplateId, selectedFormId]
    );
}
