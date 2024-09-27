import { ArrowBack } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Autocomplete, Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { FormEventHandler, SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useSaveCustomPropertiesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/utils";
import { selectIsAdminScene } from "slices/explorer";
import { AsyncState, AsyncStatus } from "types/misc";
import { mergeRecursive } from "utils/misc";

import { useGetSitesQuery } from "../api";
import {
    selectXsiteManageAccessToken,
    selectXsiteManageConfig,
    selectXsiteManageSite,
    xsiteManageActions,
} from "../slice";
import { Site } from "../types";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const config = useAppSelector(selectXsiteManageConfig);
    const accessToken = useAppSelector(selectXsiteManageAccessToken);
    const currentSite = useAppSelector(selectXsiteManageSite);
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();

    const {
        data: sites,
        isFetching: isFetchingSites,
        isError: isSitesError,
    } = useGetSitesQuery(undefined, {
        skip: accessToken.status !== AsyncStatus.Success,
    });

    const [site, setSite] = useState(
        currentSite
            ? currentSite
            : sites
              ? (sites.items.find((site) => site.siteId === config.siteId) ?? sites.items[0])
              : null,
    );
    const [saving, setSaving] = useState<AsyncState<true>>({ status: AsyncStatus.Initial });

    const handleSiteChange = (_e: SyntheticEvent, value: Site | null) => {
        if (!value) {
            return;
        }

        setSite(value);
    };

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (saving.status === AsyncStatus.Loading || !site) {
            return;
        }

        setSaving({ status: AsyncStatus.Loading });
        const configToSave = {
            siteId: site.siteId,
        };

        dispatch(xsiteManageActions.setConfig(configToSave));
        dispatch(xsiteManageActions.setSite(site));

        try {
            const [originalScene] = await loadScene(sceneId);

            const updated = mergeRecursive(originalScene, {
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    integrations: {
                        xsiteManage: configToSave,
                    },
                },
            });

            saveCustomProperties({ projectId: sceneId, data: updated.customProperties }).unwrap();
        } catch {
            console.warn("Failed to save Xsite Manage settings.");
        }

        history.push("/machines");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button onClick={() => history.goBack()} disabled={!currentSite} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                </Box>
            </Box>
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={2}>
                    {t("settings")}
                </Typography>
                <Autocomplete
                    sx={{ mb: 3 }}
                    id="xsiteManageSite"
                    fullWidth
                    options={sites?.items ?? []}
                    getOptionLabel={(opt) => opt.name}
                    value={site}
                    isOptionEqualToValue={(opt, val) => opt.siteId === val.siteId}
                    onChange={handleSiteChange}
                    size="medium"
                    includeInputInList
                    loading={isFetchingSites || true}
                    renderInput={(params) => (
                        <TextField
                            error={isSitesError}
                            helperText={isSitesError ? "An error occured while loading sites." : undefined}
                            label="Site"
                            required
                            {...params}
                        />
                    )}
                />

                <Box display="flex" justifyContent="space-between">
                    <Button
                        disabled={!currentSite}
                        color="grey"
                        variant="outlined"
                        onClick={() => {
                            history.goBack();
                        }}
                    >
                        {t("cancel")}
                    </Button>
                    <LoadingButton
                        type="submit"
                        variant="contained"
                        sx={{ minWidth: 100 }}
                        color="primary"
                        size="large"
                        loading={saving.status === AsyncStatus.Loading}
                        disabled={!site}
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
