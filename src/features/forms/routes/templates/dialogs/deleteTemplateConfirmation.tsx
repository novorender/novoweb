import { FormEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useDeleteTemplateMutation } from "features/forms/api";
import { type FormId, TemplateType } from "features/forms/types";
import { Picker, renderActions, selectPicker } from "features/render";
import { useSceneId } from "hooks/useSceneId";

interface DeleteTemplateConfirmationProps {
    title?: string;
    templateId: FormId;
    templateType?: TemplateType;
}

export function DeleteTemplateConfirmation({ title, templateId, templateType }: DeleteTemplateConfirmationProps) {
    const { t } = useTranslation();
    const history = useHistory();
    const projectId = useSceneId();
    const dispatch = useAppDispatch();
    const isPickingLocation = useAppSelector(selectPicker) === Picker.FormLocation;
    const [deleteTemplate, { isLoading: isTemplateDeleting }] = useDeleteTemplateMutation();

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await deleteTemplate({ projectId, templateId });
            if (templateType === TemplateType.Location) {
                if (isPickingLocation) {
                    dispatch(renderActions.stopPicker(Picker.FormLocation));
                }
            }
            history.push("/");
        },
        [deleteTemplate, projectId, templateId, templateType, history, isPickingLocation, dispatch],
    );

    return (
        <Confirmation
            title={t("deleteAllFormsInTemplate", { title })}
            confirmBtnText={t("delete")}
            onCancel={history.goBack}
            component="form"
            onSubmit={handleDelete}
            loading={isTemplateDeleting}
            headerShadow={false}
            textAlign="center"
            paddingBottom={0}
        />
    );
}
