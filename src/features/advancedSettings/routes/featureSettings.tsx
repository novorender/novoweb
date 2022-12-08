import { ChangeEvent } from "react";
import {
    useTheme,
    Box,
    Button,
    FormControlLabel,
    Checkbox,
    Grid,
    FormControl,
    FormLabel,
    Select,
    MenuItem,
} from "@mui/material";
import { useHistory } from "react-router-dom";
import { ArrowBack, Save } from "@mui/icons-material";

import { Accordion, AccordionDetails, AccordionSummary, Divider, LinearProgress, ScrollBox, Switch } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { AdvancedSetting, selectAdvancedSettings, renderActions } from "slices/renderSlice";
import { ButtonKey, defaultEnabledWidgets, featuresConfig, viewerWidgets, WidgetKey } from "config/features";
import {
    explorerActions,
    selectLockedWidgets,
    selectEnabledWidgets,
    selectIsAdminScene,
    selectPrimaryMenu,
} from "slices/explorerSlice";

export function FeatureSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();

    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const settings = useAppSelector(selectAdvancedSettings);
    const primaryMenu = useAppSelector(selectPrimaryMenu);
    const { showPerformance, navigationCube } = settings;

    const handleToggleFeature = ({ target: { name, checked } }: ChangeEvent<HTMLInputElement>) => {
        dispatch(renderActions.setAdvancedSettings({ [name]: checked }));
    };

    const toggleWidget = (key: WidgetKey, checked: boolean) => {
        const keys = enabledWidgets.map((w) => w.key);

        dispatch(explorerActions.setEnabledWidgets(checked ? keys.concat(key) : keys.filter((k) => k !== key)));
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
            <ScrollBox height={1} pb={3}>
                <Box p={1} mt={1} display="flex" flexDirection="column">
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                name={AdvancedSetting.NavigationCube}
                                checked={navigationCube}
                                onChange={handleToggleFeature}
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
                                onChange={handleToggleFeature}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                Performance stats
                            </Box>
                        }
                    />
                    <Divider />
                </Box>
                {!isAdminScene && (
                    <Accordion>
                        <AccordionSummary>Widgets</AccordionSummary>
                        <AccordionDetails>
                            <Grid container p={1}>
                                {[...viewerWidgets]
                                    .sort(
                                        (a, b) =>
                                            a.name.localeCompare(b.name, "en", { sensitivity: "accent" }) +
                                            ((lockedWidgets.includes(a.key) && lockedWidgets.includes(b.key)) ||
                                            (!lockedWidgets.includes(a.key) && !lockedWidgets.includes(b.key))
                                                ? 0
                                                : lockedWidgets.includes(a.key)
                                                ? 100
                                                : -100)
                                    )
                                    .map((widget) =>
                                        defaultEnabledWidgets.includes(widget.key) ? null : (
                                            <Grid item xs={6} key={widget.key}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            color="primary"
                                                            checked={
                                                                enabledWidgets.some(
                                                                    (enabled) => enabled.key === widget.key
                                                                ) && !lockedWidgets.includes(widget.key)
                                                            }
                                                            onChange={(_e, checked) =>
                                                                toggleWidget(widget.key, checked)
                                                            }
                                                            disabled={lockedWidgets.includes(widget.key)}
                                                        />
                                                    }
                                                    label={
                                                        <Box mr={0.5} sx={{ userSelect: "none" }}>
                                                            {widget.name}
                                                        </Box>
                                                    }
                                                />
                                            </Grid>
                                        )
                                    )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                )}
                <Accordion>
                    <AccordionSummary>Primary menu</AccordionSummary>
                    <AccordionDetails>
                        <Box px={1}>
                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-1"}
                                    >
                                        Button 1:
                                    </FormLabel>
                                </Box>

                                <Select readOnly disabled value={featuresConfig.home.key} id={"primary-menu-button-1"}>
                                    <MenuItem value={featuresConfig.home.key}>{featuresConfig.home.name}</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-2"}
                                    >
                                        Button 2:
                                    </FormLabel>
                                </Box>

                                <Select
                                    readOnly
                                    disabled
                                    value={featuresConfig.cameraSpeed.key}
                                    id={"primary-menu-button-2"}
                                >
                                    <MenuItem value={featuresConfig.cameraSpeed.key}>
                                        {featuresConfig.cameraSpeed.name}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-3"}
                                    >
                                        Button 3:
                                    </FormLabel>
                                </Box>

                                <Select
                                    readOnly
                                    disabled
                                    value={featuresConfig.flyToSelected.key}
                                    id={"primary-menu-button-3"}
                                >
                                    <MenuItem value={featuresConfig.flyToSelected.key}>
                                        {featuresConfig.flyToSelected.name}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-4"}
                                    >
                                        Button 4:
                                    </FormLabel>
                                </Box>

                                <Select
                                    readOnly
                                    disabled
                                    value={featuresConfig.stepBack.key}
                                    id={"primary-menu-button-4"}
                                >
                                    <MenuItem value={featuresConfig.stepBack.key}>
                                        {featuresConfig.stepBack.name}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-5"}
                                    >
                                        Button 5:
                                    </FormLabel>
                                </Box>

                                <Select
                                    onChange={(e) => {
                                        dispatch(
                                            explorerActions.setPrimaryMenu({
                                                button5: e.target.value as ButtonKey,
                                            })
                                        );
                                    }}
                                    value={primaryMenu.button5}
                                    id={"primary-menu-button-5"}
                                >
                                    <MenuItem value={featuresConfig.orthoShortcut.key}>
                                        {featuresConfig.orthoShortcut.name}
                                    </MenuItem>
                                    <MenuItem value={featuresConfig.stepForwards.key}>
                                        {featuresConfig.stepForwards.name}
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </ScrollBox>
        </>
    );
}
