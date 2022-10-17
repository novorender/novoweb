import { Autocomplete, Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Redirect, useRouteMatch } from "react-router-dom";
import { FormEventHandler, SyntheticEvent, useState } from "react";

import { useAppSelector } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { selectProjectSettings } from "slices/renderSlice";
import { ScrollBox, TextField } from "components";

import { Space } from "../../types";
import { selectAvailableJiraSpaces, selectJiraAccessTokenData } from "../../jiraSlice";
import { useGetProjectsQuery } from "../../jiraApi";

export function Settings() {
    const match = useRouteMatch();
    const theme = useTheme();

    const { jira: settings } = useAppSelector(selectProjectSettings);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const availableSpaces = useAppSelector(selectAvailableJiraSpaces);
    const [space, setSpace] = useState(
        availableSpaces.status === AsyncStatus.Success
            ? availableSpaces.data.find((s) => s.name === settings?.space) ?? availableSpaces.data[0]
            : undefined
    );
    const [project, setProject] = useState<any>(null);
    const [saving, setSaving] = useState<AsyncState<true>>({ status: AsyncStatus.Initial });

    const { data: projects, isFetching: isFetchingProjects } = useGetProjectsQuery(
        { space: space?.id ?? "", accessToken },
        { skip: !space || !accessToken }
    );

    if (availableSpaces.status !== AsyncStatus.Success) {
        return <Redirect to="/" />;
    }

    const handleSpaceChange = async (e: SyntheticEvent, value: Space | null) => {
        if (!value) {
            return;
        }

        setProject(null);
        setSpace(value);
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (saving.status === AsyncStatus.Loading) {
            return;
        }

        setSaving({ status: AsyncStatus.Loading });

        /// TODO(SAVE)
        /// dispatch
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={2}>
                    Settings
                </Typography>
                <Autocomplete
                    sx={{ mb: 3 }}
                    id="jiraSpace"
                    fullWidth
                    autoSelect
                    options={availableSpaces.data}
                    getOptionLabel={(opt) => opt.name}
                    value={space}
                    onChange={handleSpaceChange}
                    size="medium"
                    includeInputInList
                    renderInput={(params) => <TextField label="Space" required {...params} />}
                />

                <Autocomplete
                    sx={{ mb: 3 }}
                    id="jiraSpace"
                    fullWidth
                    autoSelect
                    options={!projects || isFetchingProjects ? [] : projects}
                    getOptionLabel={(opt) => `${opt.key} - ${opt.name}`}
                    value={project}
                    loading={isFetchingProjects}
                    loadingText="Loading projects..."
                    onChange={(_e, value) => {
                        if (!value) {
                            return;
                        }

                        setProject(value);
                    }}
                    size="medium"
                    includeInputInList
                    renderInput={(params) => <TextField label="Project" required {...params} />}
                />

                <Box display="flex" justifyContent="space-between">
                    <Button color="grey" variant="outlined" disabled={!settings}>
                        Cancel
                    </Button>
                    <LoadingButton
                        type="submit"
                        variant="contained"
                        sx={{ minWidth: 100 }}
                        color="primary"
                        size="large"
                        loading={saving.status === AsyncStatus.Loading}
                        disabled={!space || !project}
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
