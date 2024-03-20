import { PickSampleExt } from "@novorender/api";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { useFormsGlobals } from "../formsGlobals";
import { formsActions, selectCurrentFormsList, selectSelectedFormId } from "../slice";

export function useLocationFormAssetClickHandler() {
    const {
        state: { objectIdToFormIdMap },
    } = useFormsGlobals();
    const selectedTemplateId = useAppSelector(selectCurrentFormsList);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const dispatch = useAppDispatch();

    return useCallback(
        (result: PickSampleExt) => {
            const ids = objectIdToFormIdMap.get(result.objectId);

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
        [dispatch, objectIdToFormIdMap, selectedTemplateId, selectedFormId]
    );
}
