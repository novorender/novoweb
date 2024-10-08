import { type ObjectId } from "@novorender/webgl-api";
import { skipToken } from "@reduxjs/toolkit/query";
import { FormEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { useGetSearchFormQuery, useRevertFormMutation } from "features/forms/api";
import { formsActions } from "features/forms/slice";
import { type Form as FormType, type FormId, type FormRecord, TemplateType } from "features/forms/types";
import { determineHighlightCollection } from "features/forms/utils";
import { useSceneId } from "hooks/useSceneId";

interface RevertConfirmationProps {
    templateId: string;
    formId: FormId;
    objectGuid?: string;
    objectId?: ObjectId;
    version?: number;
    title?: string;
}

export function RevertConfirmation({
    version,
    templateId,
    objectId,
    objectGuid,
    formId,
    title,
}: RevertConfirmationProps) {
    const { t } = useTranslation();
    const projectId = useSceneId();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const templateType = useMemo(() => (objectGuid ? TemplateType.Object : TemplateType.Geo), [objectGuid]);
    const id = (objectGuid || templateId)!;

    const [revertForm, { isLoading: isFormReverting }] = useRevertFormMutation();

    const { data: currentForm, isLoading: isCurrentFormLoading } = useGetSearchFormQuery(
        objectGuid
            ? {
                  projectId,
                  objectGuid,
                  formId,
              }
            : skipToken,
    );

    const handleRevert = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            if (!version) {
                history.goBack();
                return;
            }

            try {
                const form = await revertForm({
                    projectId,
                    templateType,
                    id,
                    formId,
                    version,
                }).unwrap();

                if (templateType === TemplateType.Object && Number.isInteger(objectId)) {
                    dispatchHighlightCollections(
                        highlightCollectionsActions.move(
                            determineHighlightCollection(currentForm as FormType),
                            determineHighlightCollection(form),
                            [objectId!],
                        ),
                    );
                } else if (templateType === TemplateType.Geo) {
                    // Optimistic update so the form doesn't jump back and forth
                    dispatch(
                        formsActions.addLocationForms([
                            {
                                ...(form as FormRecord),
                                id: formId,
                                templateId,
                            },
                        ]),
                    );
                }
            } catch (error) {
                console.error(error);
            }

            if (objectGuid) {
                history.push({
                    pathname: "/search-instance",
                    search: `?objectId=${objectId}&objectGuid=${objectGuid}&formId=${formId}`,
                });
            } else {
                history.push({
                    pathname: "/location-instance",
                    search: `?templateId=${templateId}&formId=${formId}`,
                });
            }
        },
        [
            currentForm,
            dispatch,
            dispatchHighlightCollections,
            formId,
            history,
            id,
            objectGuid,
            objectId,
            projectId,
            revertForm,
            templateId,
            templateType,
            version,
        ],
    );

    return (
        <Confirmation
            title={t("revertForm", { title })}
            confirmBtnText={t("revert")}
            onCancel={history.goBack}
            component="form"
            onSubmit={handleRevert}
            loading={isFormReverting}
            headerShadow={false}
            textAlign="center"
            paddingBottom={0}
            confirmBtnDisabled={isCurrentFormLoading}
        />
    );
}
