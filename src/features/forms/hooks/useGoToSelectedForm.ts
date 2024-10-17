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
            if (newPath !== history.location.pathname) {
                history.push(newPath);
            }
        },
        [history],
    );

    useEffect(() => {
        if (template?.id && template?.type === TemplateType.Location) {
            return goIfNotCurrent(
                selectedFormId
                    ? `/location-instance?templateId=${template.id}&formId=${selectedFormId}`
                    : `/forms/${template.id}`,
            );
        }

        if (currentFormsList) {
            if (selectedFormObjectGuid) {
                return goIfNotCurrent(
                    `/search-instance?objectGuid=${selectedFormObjectGuid}&formId=${currentFormsList}`,
                );
            } else {
                return goIfNotCurrent(`/forms/${currentFormsList}`);
            }
        }
    }, [currentFormsList, goIfNotCurrent, selectedFormId, selectedFormObjectGuid, template]);
}
