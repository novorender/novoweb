import { Autocomplete, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import {
    useCreateOmegaActivityMutation,
    useGetOmegaActivityTypesQuery,
    useGetOmegaOrgUnitsQuery,
} from "apis/dataV2/dataV2Api";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import SimpleSnackbar from "components/simpleSnackbar";
import { useSceneId } from "hooks/useSceneId";
import { AsyncState, AsyncStatus } from "types/misc";

export function CreateActivity() {
    const { t } = useTranslation();
    const originalObjectId = (useLocation().state as { objectId?: number }).objectId;
    const sceneId = useSceneId();
    const history = useHistory();
    const [saveStatus, setSaveStatus] = useState<AsyncState<{ url: string }>>({ status: AsyncStatus.Initial });
    const inputsDisabled = [AsyncStatus.Loading, AsyncStatus.Success].includes(saveStatus.status);

    const { data: activityTypes, isLoading: isLoadingActivityTypes } = useGetOmegaActivityTypesQuery({
        projectId: sceneId,
    });
    const { data: orgUnits, isLoading: isLoadingOrgUnits } = useGetOmegaOrgUnitsQuery({ projectId: sceneId });
    const [createActivity] = useCreateOmegaActivityMutation();

    const [form, setForm] = useState({
        name: "",
        objectId: originalObjectId ? originalObjectId.toString() : "",
        activityType: null as null | { id: number; name: string },
        orgUnit: null as null | { id: number; name: string },
    });

    const canCancel = ![AsyncStatus.Loading, AsyncStatus.Success].includes(saveStatus.status);

    const canSave =
        form.name &&
        Number.isFinite(Number(form.objectId)) &&
        form.activityType &&
        form.orgUnit &&
        ![AsyncStatus.Loading, AsyncStatus.Success].includes(saveStatus.status);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        save();

        async function save() {
            setSaveStatus({ status: AsyncStatus.Loading });
            try {
                const resp = await createActivity({
                    projectId: sceneId,
                    activity: {
                        name: form.name,
                        objectId: Number(form.objectId),
                        activityTypeId: form.activityType!.id,
                        orgUnitId: form.orgUnit!.id,
                    },
                }).unwrap();

                setSaveStatus({ status: AsyncStatus.Success, data: { url: resp.newActivityUrl } });

                if (resp.newActivityUrl) {
                    let url = resp.newActivityUrl;
                    if (!url.match(/^https?:\/\//i)) {
                        url = `https://${url}`;
                    }
                    window.open(url);
                }
                history.goBack();
            } catch (e) {
                console.warn(e);
                setSaveStatus({ status: AsyncStatus.Error, msg: "errorOccurred" });
            }
        }
    };

    return (
        <>
            {saveStatus.status === AsyncStatus.Loading && (
                <Box>
                    <LinearProgress />
                </Box>
            )}

            <ScrollBox p={2} component="form" onSubmit={handleSubmit}>
                <Stack gap={2}>
                    <Typography fontWeight={600}>{t("createActivity")}</Typography>
                    <TextField
                        fullWidth
                        size="small"
                        label={t("name")}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        disabled={inputsDisabled}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label={t("objectId")}
                        value={form.objectId}
                        onChange={(e) => setForm({ ...form, objectId: e.target.value })}
                        disabled={Number.isInteger(originalObjectId) || inputsDisabled}
                    />
                    <Autocomplete
                        fullWidth
                        options={activityTypes ?? []}
                        getOptionLabel={(e) => e.name}
                        value={form.activityType}
                        onChange={(_e, value) => setForm({ ...form, activityType: value })}
                        size="small"
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t("activityType")}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <Fragment>
                                            {isLoadingActivityTypes ? (
                                                <CircularProgress color="inherit" size={20} />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                        </Fragment>
                                    ),
                                }}
                            />
                        )}
                        disabled={inputsDisabled}
                        loading={isLoadingActivityTypes}
                    />
                    <Autocomplete
                        fullWidth
                        options={orgUnits ?? []}
                        getOptionLabel={(e) => e.name}
                        value={form.orgUnit}
                        onChange={(_e, value) => setForm({ ...form, orgUnit: value })}
                        size="small"
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t("orgUnit")}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <Fragment>
                                            {isLoadingActivityTypes ? (
                                                <CircularProgress color="inherit" size={20} />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                        </Fragment>
                                    ),
                                }}
                            />
                        )}
                        disabled={inputsDisabled}
                        loading={isLoadingOrgUnits}
                    />

                    <Divider />

                    <Box display="flex" justifyContent="flex-end" gap={1}>
                        <Button variant="text" color="grey" onClick={() => history.goBack()} disabled={!canCancel}>
                            {t("cancel")}
                        </Button>
                        <Button variant="contained" type="submit" disabled={!canSave}>
                            {t("save")}
                        </Button>
                    </Box>
                </Stack>
            </ScrollBox>

            <SimpleSnackbar
                close={() => setSaveStatus({ status: AsyncStatus.Initial })}
                hideDuration={5000}
                message={saveStatus.status === AsyncStatus.Error ? t(saveStatus.msg) : null}
            />
        </>
    );
}
