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
import { featuresConfig } from "config/features";

import { selectAccessToken, ditioActions, selectDitioProject } from "../slice";
import { useGetProjectsQuery } from "../api";
import { Project } from "../types";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const { ditioProjectNumber } = useAppSelector(selectProjectSettings);
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
            ? projects.find((proj) => proj.projectNumber === ditioProjectNumber) ?? projects[0]
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

        dispatch(
            renderActions.setProjectSettings({
                ditioProjectNumber: project.projectNumber,
            })
        );
        dispatch(ditioActions.setProject(project));

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
                    ditioProjectNumber: project.projectNumber,
                },
            });
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
                    getOptionLabel={(opt) => opt.name}
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
