import { FormEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useDeleteAllFormsMutation } from "features/forms/api";
import { formsActions } from "features/forms/slice";
import { useSceneId } from "hooks/useSceneId";

export function DeleteTemplatesConfirmation() {
    const { t } = useTranslation();
    const history = useHistory();
    const projectId = useSceneId();
    const dispatch = useAppDispatch();
    const [deleteAllForms, { isLoading: isAllFormsDeleting }] = useDeleteAllFormsMutation();

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await deleteAllForms({ projectId });
            dispatch(formsActions.setLocationForms([]));
            history.goBack();
        },
        [deleteAllForms, projectId, dispatch, history],
    );

    return (
        <Confirmation
            title={t("deleteAllFormsConfirmation")}
            confirmBtnText={t("delete")}
            onCancel={history.goBack}
            component="form"
            onSubmit={handleDelete}
            loading={isAllFormsDeleting}
            headerShadow={false}
            textAlign="center"
            paddingBottom={0}
        />
    );
}
