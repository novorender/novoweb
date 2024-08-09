import { ArrowBack } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Autocomplete, Box, Button, CircularProgress, debounce, Typography, useTheme } from "@mui/material";
import { FormEventHandler, SyntheticEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox, TextField } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/utils";
import { selectIsAdminScene } from "slices/explorer";
import { AsyncState, AsyncStatus } from "types/misc";
import { mergeRecursive } from "utils/misc";

import { invalidateBimTrackTags, useGetProjectsQuery } from "../bimTrackApi";
import { bimTrackActions, selectAccessToken, selectBimTrackConfig } from "../bimTrackSlice";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const config = useAppSelector(selectBimTrackConfig);
    const accessToken = useAppSelector(selectAccessToken);

    const [saving, setSaving] = useState<AsyncState<true>>({ status: AsyncStatus.Initial });
    const [server, setServer] = useState(config.server);
    const [serverInput, setServerInput] = useState(server);
    const [project, setProject] = useState(config.project || null);
    const serverIsValidUrl = isValidUrl(server);

    const {
        data: projects,
        isFetching: isFetchingProjects,
        isError: projectsError,
    } = useGetProjectsQuery(
        { token: accessToken.status === AsyncStatus.Success ? accessToken.data : "", server },
        {
            skip: accessToken.status !== AsyncStatus.Success || !serverIsValidUrl,
        },
    );

    const debouncedSetServer = useMemo(
        () =>
            debounce((value: string) => {
                invalidateBimTrackTags(["Projects"]);
                setProject("");
                setServer(value);
            }, 500),
        [],
    );

    const handleProjectChange = (_e: SyntheticEvent, value: string | null) => {
        if (!value) {
            return;
        }

        setProject(value);
    };

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (saving.status === AsyncStatus.Loading || !project) {
            return;
        }

        setSaving({ status: AsyncStatus.Loading });

        const configToSave = {
            project,
            server,
        };

        dispatch(bimTrackActions.setConfig(configToSave));

        try {
            const [originalScene] = await loadScene(sceneId);

            const updated = mergeRecursive(originalScene, {
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    integrations: {
                        bimTrack: configToSave,
                    },
                },
            });

            dataApi.putScene(updated);
        } catch {
            console.warn(`Failed to save ${featuresConfig.bimTrack.name} settings.`);
        }

        history.push(`/${project}/topics`);
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button onClick={() => history.goBack()} disabled={!project} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                </Box>
            </Box>
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={2}>
                    {t("settings")}
                </Typography>
                <TextField
                    helperText={
                        "Find the exact URL to use for a project from the Newforma Konekt web platform Integrations page."
                    }
                    label="Server URL"
                    required
                    fullWidth
                    sx={{ mb: 3 }}
                    autoComplete="off"
                    onChange={(evt) => {
                        setServerInput(evt.target.value);
                        debouncedSetServer(evt.target.value);
                    }}
                    value={serverInput}
                />
                <Autocomplete
                    sx={{ mb: 3 }}
                    id="bimtrack-settings_projects"
                    fullWidth
                    disabled={!isValidUrl(server) || !projects}
                    options={
                        serverIsValidUrl && !projectsError ? (projects ?? []).map((project) => project.project_id) : []
                    }
                    getOptionLabel={(opt) =>
                        (projects ?? []).find((project) => project.project_id === opt)?.name ?? "Loading..."
                    }
                    value={project || null}
                    onChange={handleProjectChange}
                    size="medium"
                    includeInputInList
                    loading={isFetchingProjects}
                    renderInput={(params) => (
                        <TextField
                            error={projectsError || (!serverIsValidUrl && Boolean(server.trim()))}
                            helperText={
                                projectsError
                                    ? "An error occured while loading projects. Is the server URL correct?"
                                    : !serverIsValidUrl && Boolean(server.trim())
                                      ? "The server URL is invalid."
                                      : undefined
                            }
                            label="Project"
                            required
                            {...params}
                        />
                    )}
                />

                <Box display="flex" justifyContent="space-between">
                    <Button
                        disabled={!project}
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
                        disabled={!project}
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

function isValidUrl(str: string): boolean {
    try {
        new URL(str.trim());
        return true;
    } catch {
        return false;
    }
}
