import { Typography } from "@mui/material";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useSetOmega365ProjectConfigMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { selectOmega365ConfigDraft } from "../selectors";
import { omega365Actions } from "../slice";

export default function Save() {
    const { t } = useTranslation();
    const history = useHistory();
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);
    const closeAfter = new URLSearchParams(useLocation().search).get("closeAfter") === "true";
    const configDraft = useAppSelector(selectOmega365ConfigDraft);
    const projectId = useSceneId();
    const dispatch = useAppDispatch();

    const [save] = useSetOmega365ProjectConfigMutation();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();

        if (!configDraft) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);

        try {
            await save({ projectId, config: configDraft }).unwrap();
            dispatch(omega365Actions.setConfig(configDraft));
            if (closeAfter) {
                dispatch(omega365Actions.setConfigDraft(null));
                history.push("/");
            } else {
                history.push("/config");
            }
        } catch (ex) {
            console.warn(ex);
            setSaveStatus(AsyncStatus.Error);
        }
    };

    return (
        <Confirmation
            title={t("saveOmega365Configuration?")}
            confirmBtnText={t("save")}
            onCancel={() => history.goBack()}
            component="form"
            onSubmit={handleSave}
            loading={saveStatus === AsyncStatus.Loading}
            headerShadow={false}
        >
            {saveStatus === AsyncStatus.Error ? <Typography color="error">{t("errorOccurred")}</Typography> : null}
        </Confirmation>
    );
}
