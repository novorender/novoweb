import { ArrowBack } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Autocomplete, Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { FormEventHandler, SyntheticEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, ScrollBox, TextField } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/hooks/useHandleInit";
import { selectIsAdminScene } from "slices/explorerSlice";
import { AsyncState, AsyncStatus } from "types/misc";
import { mergeRecursive } from "utils/misc";

import { useGetProjectsQuery } from "../api";
import { ditioActions, selectAccessToken, selectDitioConfig, selectDitioProject } from "../slice";
import { Project } from "../types";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const config = useAppSelector(selectDitioConfig);
    const accessToken = useAppSelector(selectAccessToken);
    const currentProject = useAppSelector(selectDitioProject);

    const {
        data: projects,
        isFetching: isFetchingProjects,
        isError: projectsError,
    } = useGetProjectsQuery(undefined, {
        skip: accessToken.status !== AsyncStatus.Success,
    });

    const [project, setProject] = useState(
        currentProject
            ? currentProject
            : projects
            ? projects.find((proj) => proj.projectNumber === config.projectNumber) ?? projects[0]
            : null
    );
    const [saving, setSaving] = useState<AsyncState<true>>({ status: AsyncStatus.Initial });

    const handleProjectChange = (_e: SyntheticEvent, value: Project | null) => {
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
            projectNumber: project.projectNumber,
        };

        dispatch(ditioActions.setConfig(configToSave));
        dispatch(ditioActions.setProject(project));

        try {
            const [originalScene] = await loadScene(sceneId);

            const updated = mergeRecursive(originalScene, {
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    integrations: {
                        ditio: configToSave,
                    },
                },
            });

            dataApi.putScene(updated);
        } catch {
            console.warn(`Failed to save ${featuresConfig.ditio.name} settings.`);
        }

        history.push("/feed");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button onClick={() => history.goBack()} disabled={!currentProject} color="grey">
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
                    id="ditio-settings_projects"
                    fullWidth
                    options={projects ?? []}
                    getOptionLabel={(opt) => `${opt.name} (${opt.projectNumber})`}
                    value={project}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    onChange={handleProjectChange}
                    size="medium"
                    includeInputInList
                    loading={isFetchingProjects}
                    renderInput={(params) => (
                        <TextField
                            error={projectsError}
                            helperText={projectsError ? "An error occured while loading projects." : undefined}
                            label="Project"
                            required
                            {...params}
                        />
                    )}
                />

                <Box display="flex" justifyContent="space-between">
                    <Button
                        disabled={!currentProject}
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
                        disabled={!project}
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
