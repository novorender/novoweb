import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/store";

import { selectCurrentTemplate, selectSelectedFormId } from "../slice";
import { TemplateType } from "../types";

export function useGoToSelectedForm() {
    const history = useHistory();
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const template = useAppSelector(selectCurrentTemplate);

    useEffect(() => {
        if (!template || template.type !== TemplateType.Location) {
            return;
        }

        let newPath: string;
        if (selectedFormId) {
            newPath = `/location-instance/${template.id}-${selectedFormId}`;
        } else {
            newPath = `/forms/${template.id}`;
        }

        if (newPath !== history.location.pathname) {
            history.push(newPath);
        }
    }, [history, selectedFormId, template]);
}
