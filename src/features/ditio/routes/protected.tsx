import { LoadingButton } from "@mui/lab";
import { Box, CircularProgress, FormHelperText, Typography } from "@mui/material";
import { FormEventHandler, PropsWithChildren, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSaveDitioConfigMutation } from "apis/dataV2/dataV2Api";
import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LinearProgress, ScrollBox, TextField } from "components";
import { featuresConfig } from "config/features";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { selectUser } from "slices/authSlice";
import { AsyncStatus } from "types/misc";

import { ditioActions, selectDitioAccessToken } from "../slice";

export function Protected({ sceneId, children }: PropsWithChildren<{ sceneId: string }>) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [status, setStatus] = useState(AsyncStatus.Initial);
    const token = useAppSelector(selectDitioAccessToken);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.IntDitioManage);
    const user = useAppSelector(selectUser);
    const [saveDitioConfig] = useSaveDitioConfigMutation();

    if (token.status === AsyncStatus.Success) {
        return children;
    } else if (token.status === AsyncStatus.Initial || token.status === AsyncStatus.Loading) {
        return (
            <Box boxShadow={(theme) => theme.customShadows.widgetHeader} position={"relative"}>
                <LinearProgress />
            </Box>
        );
    } else if (!canManage) {
        return (
            <>
                <Box
                    boxShadow={(theme) => theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
                {user && (
                    <Typography p={1}>{t("notSetUpForProject", { name: t(featuresConfig.ditio.nameKey) })}</Typography>
                )}
                {!user && (
                    <Typography p={1}>{t("logInToAccess", { name: t(featuresConfig.ditio.nameKey) })}</Typography>
                )}
            </>
        );
    }

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (!clientId || !clientSecret) {
            return;
        }

        setStatus(AsyncStatus.Loading);

        try {
            const res = await saveDitioConfig({
                projectId: sceneId,
                data: { client_id: clientId, client_secret: clientSecret },
            }).unwrap();

            if (res.access_token) {
                // reset to be handled in useHandleDitioAuth();
                dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Initial }));
            }
        } catch {
            setStatus(AsyncStatus.Error);
        }
    };

    return (
        <>
            <Box
                boxShadow={(theme) => theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={2}>
                    {t("addIntegrationCredentials", { name: t(featuresConfig.ditio.nameKey) })}
                </Typography>

                <TextField
                    sx={{ mb: 2 }}
                    fullWidth
                    autoComplete="off"
                    value={clientId}
                    label="Client ID"
                    onChange={(evt) => setClientId(evt.target.value)}
                />

                <TextField
                    sx={{ mb: 1 }}
                    fullWidth
                    autoComplete="off"
                    value={clientSecret}
                    label="Client secret"
                    onChange={(evt) => setClientSecret(evt.target.value)}
                />

                {status === AsyncStatus.Error && (
                    <FormHelperText sx={{ pl: 1 }} error={true}>
                        {t("invalidCredentials")}
                    </FormHelperText>
                )}

                <Box display="flex" justifyContent="flex-end">
                    <LoadingButton
                        type="submit"
                        variant="contained"
                        sx={{ minWidth: 100 }}
                        color="primary"
                        size="large"
                        loading={status === AsyncStatus.Loading}
                        disabled={!clientId || !clientSecret}
                        loadingIndicator={
                            <Box display="flex" alignItems="center">
                                {t("save")}
                                <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        {t("save")}
                    </LoadingButton>
                </Box>
            </ScrollBox>
        </>
    );
}
