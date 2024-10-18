import { PickSampleExt } from "@novorender/api";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { renderActions } from "features/render";
import { useOpenWidget } from "hooks/useOpenWidget";

import { useLazyFormsGlobals } from "../formsGlobals/hooks";
import { formsActions, selectCurrentFormsList, selectSelectedFormId } from "../slice";

export function useLocationFormAssetClickHandler() {
    const lazyFormsGlobals = useLazyFormsGlobals();
    const selectedTemplateId = useAppSelector(selectCurrentFormsList);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const openWidget = useOpenWidget();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    return useCallback(
        (result: PickSampleExt) => {
            const ids = lazyFormsGlobals.current.objectIdToFormIdMap.get(result.objectId);

            if (!ids) {
                return false;
            }

            const { templateId, formId } = ids;
            const isSelected = templateId && formId && selectedTemplateId === templateId && selectedFormId === formId;

            if (!isSelected) {
                dispatch(renderActions.setMainObject(undefined));
                dispatch(formsActions.setSelectedFormObjectGuid(undefined));
                dispatchHighlighted(highlightActions.setIds([]));
                dispatchHighlightCollections(highlightCollectionsActions.clearForms());
                dispatch(formsActions.setCurrentFormsList(templateId));
                dispatch(formsActions.setSelectedFormId(formId));
                openWidget(featuresConfig.forms.key, { force: true });
            } else {
                dispatch(formsActions.setSelectedFormId(undefined));
            }

            return true;
        },
        [
            lazyFormsGlobals,
            selectedTemplateId,
            selectedFormId,
            dispatch,
            openWidget,
            dispatchHighlighted,
            dispatchHighlightCollections,
        ],
    );
}
