import { useCallback, useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";

import {
    selectCurrentFormsList,
    selectCurrentTemplate,
    selectSelectedFormId,
    selectSelectedFormObjectGuid,
} from "../slice";
import { TemplateType } from "../types";

export function useGoToSelectedForm() {
    const history = useHistory();
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const selectedFormObjectGuid = useAppSelector(selectSelectedFormObjectGuid);
    const template = useAppSelector(selectCurrentTemplate);
    const currentFormsList = useAppSelector(selectCurrentFormsList);

    const goIfNotCurrent = useCallback(
        (newPath: string) => {
            if (!history.location.pathname.startsWith(newPath)) {
                history.push(newPath);
            }
        },
        [history],
    );

    useEffect(() => {
        // navigate to the selected geo form
        if (template?.id && template.type === TemplateType.Location) {
            if (selectedFormId) {
                if (!Number.isInteger(+selectedFormId)) {
                    return;
                }
                return goIfNotCurrent(`/location-instance?templateId=${template.id}&formId=${selectedFormId}`);
            }
            return goIfNotCurrent(`/forms/${template.id}`);
        }

        // navigate to the selected object form
        if (currentFormsList) {
            if (selectedFormObjectGuid) {
                goIfNotCurrent(`/search-instance?objectGuid=${selectedFormObjectGuid}&formId=${currentFormsList}`);
            } else {
                goIfNotCurrent(`/forms/${currentFormsList}`);
            }
        }
    }, [currentFormsList, goIfNotCurrent, selectedFormId, selectedFormObjectGuid, template]);
}
