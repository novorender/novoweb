import { FormEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useDeleteLocationFormMutation } from "features/forms/api";
import { formsActions } from "features/forms/slice";
import { type FormId } from "features/forms/types";
import { useSceneId } from "hooks/useSceneId";

interface DeleteConfirmationProps {
    templateId: string;
    formId: FormId;
    title?: string;
}

export function DeleteConfirmation({ templateId, formId, title }: DeleteConfirmationProps) {
    const { t } = useTranslation();
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const [deleteForm, { isLoading: isFormDeleting }] = useDeleteLocationFormMutation();

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await deleteForm({
                projectId: sceneId,
                templateId,
                formId,
            });
            dispatch(formsActions.setSelectedFormId(undefined));
            history.goBack();
        },
        [sceneId, templateId, formId, deleteForm, dispatch, history],
    );

    return (
        <Confirmation
            title={t("deleteForm", { title })}
            confirmBtnText={t("delete")}
            onCancel={history.goBack}
            component="form"
            onSubmit={handleDelete}
            loading={isFormDeleting}
            headerShadow={false}
            textAlign="center"
            paddingBottom={0}
        />
    );
}
