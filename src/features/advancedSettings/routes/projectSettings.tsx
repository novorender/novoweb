import { useTheme, Box, Button, Autocomplete, createFilterOptions } from "@mui/material";
import { useHistory } from "react-router-dom";
import { ArrowBack, Save } from "@mui/icons-material";

import { dataApi } from "app";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { ProjectSetting, renderActions, selectProjectSettings } from "slices/renderSlice";
import { selectLockedWidgets } from "slices/explorerSlice";
import { featuresConfig } from "config/features";
import { useState } from "react";

const filter = createFilterOptions<string>();

export function ProjectSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();

    const settings = useAppSelector(selectProjectSettings);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const dispatch = useAppDispatch();

    const [ditioProject, setDitioProject] = useState(settings.ditioProjectNumber);

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
                <Box>
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} px={1} py={3}>
                <Autocomplete
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={wkZones}
                    value={settings[ProjectSetting.TmZone]}
                    onChange={(_event, newValue) => {
                        if (newValue) {
                            dispatch(renderActions.setProjectSettings({ [ProjectSetting.TmZone]: newValue }));
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
                {!lockedWidgets.includes(featuresConfig.ditio.key) ? (
                    <TextField
                        sx={{ mt: 2 }}
                        fullWidth
                        size="medium"
                        label="Ditio project number"
                        value={ditioProject}
                        onChange={({ target: { value } }) => setDitioProject(value)}
                        onBlur={() =>
                            dispatch(
                                renderActions.setProjectSettings({ [ProjectSetting.DitioProjectNumber]: ditioProject })
                            )
                        }
                    />
                ) : null}
            </ScrollBox>
        </>
    );
}
