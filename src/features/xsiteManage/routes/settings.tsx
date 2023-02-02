import { Autocomplete, Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useHistory } from "react-router-dom";
import { FormEventHandler, SyntheticEvent, useState } from "react";
import { SceneData } from "@novorender/data-js-api";
import { ArrowBack } from "@mui/icons-material";

import { dataApi } from "app";
import { selectIsAdminScene } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { renderActions, selectProjectSettings } from "slices/renderSlice";
import { Divider, ScrollBox, TextField } from "components";

import { Site } from "../types";
import { selectXsiteManageAccessToken, selectXsiteManageSite, xsiteManageActions } from "../slice";
import { useGetSitesQuery } from "../api";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const { xsiteManage: settings } = useAppSelector(selectProjectSettings);
    const accessToken = useAppSelector(selectXsiteManageAccessToken);
    const currentSite = useAppSelector(selectXsiteManageSite);

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
            ? sites.items.find((site) => site.siteId === settings.siteId) ?? sites.items[0]
            : null
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
        const xsiteManageSettings = {
            siteId: site.siteId,
        };

        dispatch(
            renderActions.setProjectSettings({
                xsiteManage: xsiteManageSettings,
            })
        );
        dispatch(xsiteManageActions.setSite(site));

        try {
            const {
                url: _url,
                customProperties = {},
                ...originalScene
            } = (await dataApi.loadScene(sceneId)) as SceneData;

            dataApi.putScene({
                ...originalScene,
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    ...customProperties,
                    xsiteManageSettings,
                },
            });
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
                        Back
                    </Button>
                </Box>
            </Box>
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={2}>
                    Settings
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
                        Cancel
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
                                Save <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        Save
                    </LoadingButton>
                </Box>
            </ScrollBox>
        </>
    );
}
