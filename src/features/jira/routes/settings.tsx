import { AccessAlarm, Announcement, ArrowBack, Build, Engineering, HeadsetMic, ViewInAr } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import {
    AccordionDetails,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    MenuItem,
    Select,
    Typography,
    useTheme,
} from "@mui/material";
import { FormEventHandler, SyntheticEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app";
import { Accordion, AccordionSummary, Divider, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/utils";
import { selectIsAdminScene } from "slices/explorer";
import { AsyncState, AsyncStatus } from "types/misc";
import { mergeRecursive } from "utils/misc";

import {
    useGetAccessibleResourcesQuery,
    useGetBaseIssueTypesQuery,
    useGetComponentsQuery,
    useGetProjectsQuery,
} from "../jiraApi";
import {
    jiraActions,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraConfig,
    selectJiraMarkersConfig,
    selectJiraProject,
    selectJiraSpace,
} from "../jiraSlice";
import { Component, IssueType, Project, Space } from "../types";

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
    const currentMarkerConfig = useAppSelector(selectJiraMarkersConfig);

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
    const [markers, setMarkers] = useState(currentMarkerConfig);

    const { data: projects, isFetching: isFetchingProjects } = useGetProjectsQuery(
        { space: space?.id ?? "", accessToken },
        { skip: !space || !accessToken }
    );

    const { data: components, isFetching: isFetchingComponents } = useGetComponentsQuery(
        { space: space?.id ?? "", project: project?.key ?? "", accessToken },
        { skip: !space || !accessToken || !project }
    );

    const { data: issueTypes = [], isFetching: isFetchingIssuesTypes } = useGetBaseIssueTypesQuery(
        {
            accessToken,
            projectId: project?.id ?? "",
            space: space?.id ?? "",
        },
        { skip: !accessToken || !project || !space, refetchOnMountOrArgChange: true }
    );

    const handleSpaceChange = (e: SyntheticEvent, value: Space | null) => {
        if (!value) {
            return;
        }

        setProject(null);
        setComponent(null);
        setSpace(value);
    };

    const handleProjectChange = (e: SyntheticEvent, value: Project | null) => {
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
        const baseConfig = {
            space: space.name,
            project: project.key,
            component: component.name,
        };

        const configToSave = {
            ...baseConfig,
            markers: {
                issueTypes: markers.issueTypes,
            },
        };

        dispatch(jiraActions.setConfig(baseConfig));
        dispatch(jiraActions.setMarkersConfig(configToSave.markers));
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

                <Accordion disabled={!project || isFetchingIssuesTypes} sx={{ mb: 2 }}>
                    <AccordionSummary>Marker icons</AccordionSummary>
                    <AccordionDetails>
                        <List dense disablePadding>
                            {issueTypes.map((issueType) => (
                                <MarkerIconListItem
                                    key={issueType.id}
                                    issueType={issueType}
                                    icon={markers.issueTypes[issueType.id]?.icon ?? "announcement"}
                                    setIcon={(icon) =>
                                        setMarkers((state) => ({
                                            ...state,
                                            issueTypes: {
                                                ...state.issueTypes,
                                                [issueType.id]: {
                                                    ...state.issueTypes[issueType.id],
                                                    icon,
                                                },
                                            },
                                        }))
                                    }
                                />
                            ))}
                        </List>
                    </AccordionDetails>
                </Accordion>

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

function MarkerIconListItem({
    issueType,
    icon,
    setIcon,
}: {
    issueType: IssueType;
    icon: string;
    setIcon: (icon: string) => void;
}) {
    return (
        <ListItem disablePadding sx={{ display: "block" }}>
            <Box
                sx={{
                    display: "flex",
                    width: 1,
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Box>{issueType.name}</Box>
                <Select size="small" value={icon} onChange={(event) => setIcon(event.target.value)}>
                    <MenuItem value="announcement">
                        <ListItemIcon>
                            <Announcement fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                    <MenuItem value="engineering">
                        <ListItemIcon>
                            <Engineering fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                    <MenuItem value="headsetMic">
                        <ListItemIcon>
                            <HeadsetMic fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                    <MenuItem value="viewInAr">
                        <ListItemIcon>
                            <ViewInAr fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                    <MenuItem value="accessAlarm">
                        <ListItemIcon>
                            <AccessAlarm fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                    <MenuItem value="build">
                        <ListItemIcon>
                            <Build fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                </Select>
            </Box>
            <Divider sx={(theme) => ({ my: 1, borderColor: theme.palette.grey[300] })} />
        </ListItem>
    );
}
