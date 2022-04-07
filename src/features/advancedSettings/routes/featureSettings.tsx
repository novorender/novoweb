import { ChangeEvent } from "react";
import { useTheme, Box, Button, FormControlLabel } from "@mui/material";
import { useHistory } from "react-router-dom";
import { ArrowBack, Save } from "@mui/icons-material";

import { Divider, LinearProgress, ScrollBox, Switch } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { AdvancedSetting, selectAdvancedSettings, renderActions } from "slices/renderSlice";

export function FeatureSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();

    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectAdvancedSettings);
    const { showPerformance, navigationCube } = settings;

    const handleToggle = ({ target: { name, checked } }: ChangeEvent<HTMLInputElement>) => {
        dispatch(renderActions.setAdvancedSettings({ [name]: checked }));
    };

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
                    <Button sx={{ ml: "auto" }} onClick={save} color="grey" disabled={saving}>
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
            <ScrollBox height={1} pb={3}>
                <Box p={1} mt={1} display="flex" flexDirection="column">
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                name={AdvancedSetting.NavigationCube}
                                checked={navigationCube}
                                onChange={handleToggle}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                Navigation cube
                            </Box>
                        }
                    />
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                name={AdvancedSetting.ShowPerformance}
                                checked={showPerformance}
                                onChange={handleToggle}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                Performance stats
                            </Box>
                        }
                    />
                </Box>
            </ScrollBox>
        </>
    );
}
