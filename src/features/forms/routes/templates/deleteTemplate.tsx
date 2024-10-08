import { useLocation } from "react-router-dom";

import { type FormId, TemplateType } from "features/forms/types";

import { DeleteTemplateConfirmation } from "./dialogs/deleteTemplateConfirmation";

export function DeleteTemplate() {
    const location = useLocation();

    const { title, templateId, templateType } = location.state as {
        title?: string;
        templateId: FormId;
        templateType?: TemplateType;
    };

    return <DeleteTemplateConfirmation title={title} templateId={templateId} templateType={templateType} />;
}
