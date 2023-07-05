import { ArrowBack } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Autocomplete, Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { mergeRecursive } from "@novorender/web_app";
import { FormEventHandler, SyntheticEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/hooks/useHandleInit";
import { selectIsAdminScene } from "slices/explorerSlice";
import { AsyncState, AsyncStatus } from "types/misc";

import { useGetAccessibleResourcesQuery, useGetComponentsQuery, useGetProjectsQuery } from "../jiraApi";
import {
    jiraActions,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraConfig,
    selectJiraProject,
    selectJiraSpace,
} from "../jiraSlice";
import { Component, Project, Space } from "../types";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const config = useAppSelector(selectJiraConfig);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const currentProject = useAppSelector(selectJiraProject);
    const currentSpace = useAppSelector(selectJiraSpace);
    const currentComponent = useAppSelector(selectJiraComponent);

    const { data: accessibleResources } = useGetAccessibleResourcesQuery(
        { accessToken: accessToken },
        { skip: !accessToken }
    );

    const [space, setSpace] = useState(
        currentSpace
            ? currentSpace
            : accessibleResources
            ? accessibleResources.find((resource) => resource.name === config?.space) ?? accessibleResources[0]
            : null
    );
    const [project, setProject] = useState<Project | null>(currentProject ?? null);
    const [component, setComponent] = useState<Component | null>(currentComponent ?? null);
    const [saving, setSaving] = useState<AsyncState<true>>({ status: AsyncStatus.Initial });

    const { data: projects, isFetching: isFetchingProjects } = useGetProjectsQuery(
        { space: space?.id ?? "", accessToken },
        { skip: !space || !accessToken }
    );

    const { data: components, isFetching: isFetchingComponents } = useGetComponentsQuery(
        { space: space?.id ?? "", project: project?.key ?? "", accessToken },
        { skip: !space || !accessToken || !project }
    );

    const handleSpaceChange = (e: SyntheticEvent, value: Space | null) => {
        if (!value) {
            return;
        }

        setProject(null);
        setComponent(null);
        setSpace(value);
    };

    const handleProjectChange = (e: SyntheticEvent, value: any | null) => {
        if (!value) {
            return;
        }

        setProject(value);
        setComponent(null);
    };

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (saving.status === AsyncStatus.Loading || !space || !project || !component) {
            return;
        }

        setSaving({ status: AsyncStatus.Loading });
        const configToSave = {
            space: space.name,
            project: project.key,
            component: component.name,
        };

        dispatch(jiraActions.setConfig(configToSave));
        dispatch(jiraActions.setSpace(space));
        dispatch(jiraActions.setProject(project));
        dispatch(jiraActions.setComponent(component));

        try {
            const [originalScene] = await loadScene(sceneId);

            const updated = mergeRecursive(originalScene, {
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    integrations: {
                        jira: configToSave,
                    },
                },
            });

            dataApi.putScene(updated);
        } catch {
            console.warn("Failed to save Jira settings.");
        }

        history.push("/issues");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button
                        onClick={() => history.goBack()}
                        disabled={!currentSpace || !currentProject || !currentComponent}
                        color="grey"
                    >
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
                    id="jiraSpace"
                    fullWidth
                    options={accessibleResources ?? []}
                    getOptionLabel={(opt) => opt.name}
                    value={space}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    onChange={handleSpaceChange}
                    size="medium"
                    includeInputInList
                    renderInput={(params) => <TextField label="Space" required {...params} />}
                />

                <Autocomplete
                    sx={{ mb: 3 }}
                    id="jiraSpace"
                    fullWidth
                    options={!projects || isFetchingProjects ? [] : projects}
                    getOptionLabel={(opt) => `${opt.key} - ${opt.name}`}
                    value={project}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    loading={isFetchingProjects}
                    loadingText="Loading projects..."
                    onChange={handleProjectChange}
                    size="medium"
                    includeInputInList
                    renderInput={(params) => <TextField label="Project" required {...params} />}
                />

                <Autocomplete
                    sx={{ mb: 3 }}
                    id="jiraSpace"
                    fullWidth
                    options={!components || !project || isFetchingComponents ? [] : components}
                    getOptionLabel={(opt) => opt.name}
                    value={component}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    loading={isFetchingComponents}
                    loadingText="Loading components..."
                    onChange={(_e, value) => {
                        if (value) {
                            setComponent(value);
                        }
                    }}
                    size="medium"
                    includeInputInList
                    renderInput={(params) => <TextField label="Component" required {...params} />}
                />

                <Box display="flex" justifyContent="space-between">
                    <Button
                        disabled={!currentSpace || !currentProject || !currentComponent}
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
                        disabled={!space || !project || !component}
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
