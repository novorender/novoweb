import { ArrowBack } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Autocomplete, Box, Button, CircularProgress, Typography } from "@mui/material";
import { mergeRecursive } from "@novorender/api";
import { FormEventHandler, SyntheticEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { useSaveCustomPropertiesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/utils";
import { selectIsAdminScene } from "slices/explorer";
import { AsyncState, AsyncStatus } from "types/misc";

import { useGetProjectsQuery } from "../api";
import { ditioActions, selectDitioAccessToken, selectDitioProjects } from "../slice";

export function Settings({ sceneId }: { sceneId: string }) {
    const history = useHistory();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const token = useAppSelector(selectDitioAccessToken);
    // const [projectsInput, setProjectsInput] = useState("");
    const currentProjects = useAppSelector(selectDitioProjects);
    const [projects, setProjects] = useState([...currentProjects]);
    const [saving, setSaving] = useState<AsyncState<true>>({ status: AsyncStatus.Initial });
    const {
        data: _allProjects,
        isLoading: isLoadingProjects,
        isError: projectsError,
    } = useGetProjectsQuery(undefined, {
        skip: token.status !== AsyncStatus.Success,
    });
    const allProjects = _allProjects
        ? Object.fromEntries(_allProjects.map((project) => [project.id, project]))
        : undefined;
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();

    // const handleProjectsChange = (_e: SyntheticEvent, value: any[]) => {
    const handleProjectsChange = (_e: SyntheticEvent, value: string | null) => {
        if (!value) {
            return;
        }

        setProjects([value]);
        // setProjects(value);
    };

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (saving.status === AsyncStatus.Loading || !projects.length) {
            return;
        }

        setSaving({ status: AsyncStatus.Loading });

        const configToSave = {
            projects,
        };
        dispatch(ditioActions.setConfig(configToSave));
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

            saveCustomProperties({ projectId: scene.id, data: updated.customProperties }).unwrap();
        } catch {
            console.warn(`Failed to save ${featuresConfig.ditio.name} settings.`);
        }

        history.push("/");
    };

    return (
        <>
            <Box boxShadow={(theme) => theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button onClick={() => history.goBack()} disabled={!currentProjects.length} color="grey">
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            {isLoadingProjects && (
                <Box position={"relative"}>
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={2}>
                    Settings
                </Typography>
                <Autocomplete
                    sx={{ mb: 3 }}
                    id="ditio-machines-settings_projects"
                    fullWidth
                    options={allProjects ? Object.keys(allProjects) : []}
                    getOptionLabel={(opt) =>
                        allProjects ? `${allProjects[opt]?.name} (${allProjects[opt]?.projectNumber})` : "Loading..."
                    }
                    onChange={handleProjectsChange}
                    size="medium"
                    value={allProjects ? (projects[0] ? projects[0] : null) : null}
                    // value={allProjects ? projects : null}
                    // multiple
                    // disableCloseOnSelect={true}
                    // inputValue={projectsInput}
                    // onInputChange={(_evt, value, reason) => {
                    //     if (reason === "reset") {
                    //         return;
                    //     }
                    //     setProjectsInput(value);
                    // }}
                    // renderInput={(params) => (
                    //     <TextField
                    //         error={projectsError}
                    //         helperText={projectsError ? "An error occured while loading projects." : undefined}
                    //         label="Projects"
                    //         maxRows={3}
                    //         {...params}
                    //     />
                    // )}
                    disabled={isLoadingProjects || projectsError}
                    loading={isLoadingProjects}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Projects"
                            error={projectsError}
                            helperText={projectsError ? "An error occured while loading projects." : undefined}
                            maxRows={3}
                        />
                    )}
                />

                <Box display="flex" justifyContent="space-between">
                    <Button
                        disabled={!currentProjects.length}
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
                        disabled={!projects.length || projectsError || isLoadingProjects}
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
