import { Alert, FormControlLabel, Typography } from "@mui/material";
import { FormEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { Confirmation, IosSwitch } from "components";
import { useSignLocationFormMutation, useSignSearchFormMutation } from "features/forms/api";
import { type FormId, type FormObjectGuid } from "features/forms/types";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectUser } from "slices/authSlice";

interface SignConfirmationProps {
    objectGuid?: FormObjectGuid;
    templateId?: string;
    formId: FormId;
    title?: string;
}

export function SignConfirmation({ objectGuid, templateId, formId, title }: SignConfirmationProps) {
    const { t } = useTranslation();
    const history = useHistory();
    const sceneId = useSceneId();
    const user = useAppSelector(selectUser);
    const [signSearchForm] = useSignSearchFormMutation();
    const [signLocationForm] = useSignLocationFormMutation();

    const [isFinalSignature, toggleFinalSignature] = useToggle(false);

    const handleSign = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (templateId) {
                signLocationForm({
                    projectId: sceneId,
                    templateId,
                    formId,
                    isFinal: isFinalSignature,
                }).then((res) => {
                    if ("error" in res) {
                        console.error(res.error);
                        return;
                    }
                });
            } else if (objectGuid) {
                signSearchForm({
                    projectId: sceneId,
                    objectGuid,
                    formId,
                    isFinal: isFinalSignature,
                }).then((res) => {
                    if ("error" in res) {
                        console.error(res.error);
                        return;
                    }
                });
            }
            history.goBack();
        },
        [templateId, objectGuid, history, signLocationForm, sceneId, formId, isFinalSignature, signSearchForm],
    );

    return (
        <Confirmation
            title={t("signForm", { title, user: user?.name ?? user?.user ?? t("unknown") })}
            confirmBtnText={t("sign")}
            onCancel={() => history.goBack()}
            component="form"
            onSubmit={handleSign}
            headerShadow={false}
            textAlign="center"
            paddingBottom={0}
        >
            <FormControlLabel
                control={
                    <IosSwitch
                        size="medium"
                        color="primary"
                        checked={isFinalSignature}
                        onChange={() => toggleFinalSignature()}
                    />
                }
                label={<Typography>{t("signatureIsFinal")}</Typography>}
                sx={{ mb: isFinalSignature ? 0 : 8 }}
            />
            {isFinalSignature && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t("finalSignatureWarning")}
                </Alert>
            )}
        </Confirmation>
    );
}
