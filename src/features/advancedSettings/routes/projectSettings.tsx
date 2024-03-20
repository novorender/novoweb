import { ArrowBack, Save } from "@mui/icons-material";
import { Autocomplete, Box, Button, createFilterOptions, Typography, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { renderActions, selectProjectSettings } from "features/render";

const filter = createFilterOptions<string>();

export function ProjectSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();

    const settings = useAppSelector(selectProjectSettings);
    const dispatch = useAppDispatch();

    const wkZones = dataApi.getWKZones();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        Save
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} px={1} mt={1} pb={3}>
                <Typography pt={1} variant="h6" fontWeight={600}>
                    Project settings
                </Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
                <Autocomplete
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={wkZones}
                    value={settings.tmZone || null}
                    onChange={(_event, newValue) => {
                        if (newValue) {
                            dispatch(renderActions.setProject({ tmZone: newValue }));
                        }
                    }}
                    filterOptions={filter}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="TM Zone"
                            InputProps={{
                                ...params.InputProps,
                            }}
                        />
                    )}
                    ListboxProps={{ style: { maxHeight: "200px" } }}
                />
            </ScrollBox>
        </>
    );
}
