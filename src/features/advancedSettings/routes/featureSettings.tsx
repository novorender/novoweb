import { ArrowBack, Save } from "@mui/icons-material";
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    MenuItem,
    Select,
    Typography,
    useTheme,
} from "@mui/material";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary, Divider, LinearProgress, ScrollBox, Switch } from "components";
import { CanvasContextMenuFeatureKey, canvasContextMenuFeatures } from "config/canvasContextMenu";
import { ButtonKey, defaultEnabledWidgets, featuresConfig, viewerWidgets, WidgetKey } from "config/features";
import { renderActions, selectDebugStats, selectGeneratedParametricData, selectNavigationCube } from "features/render";
import {
    explorerActions,
    selectCanvasContextMenuFeatures,
    selectEnabledWidgets,
    selectLockedWidgets,
    selectPrimaryMenu,
} from "slices/explorer";

export function FeatureSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();

    const dispatch = useAppDispatch();
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const primaryMenu = useAppSelector(selectPrimaryMenu);
    const enabledCanvasContextMenuFeatures = useAppSelector(selectCanvasContextMenuFeatures);
    const navigationCube = useAppSelector(selectNavigationCube);
    const debugStats = useAppSelector(selectDebugStats);
    const generatedParametricData = useAppSelector(selectGeneratedParametricData);

    const toggleWidget = (key: WidgetKey, checked: boolean) => {
        const keys = enabledWidgets.map((w) => w.key);

        dispatch(explorerActions.setEnabledWidgets(checked ? keys.concat(key) : keys.filter((k) => k !== key)));
    };

    const toggleCanvasContextMenuFeature = (key: CanvasContextMenuFeatureKey, checked: boolean) => {
        const keys = enabledCanvasContextMenuFeatures;
        dispatch(
            explorerActions.setCanvasContextMenu({
                features: checked ? keys.concat(key) : keys.filter((k) => k !== key),
            })
        );
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
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} mt={1} pb={3}>
                <Typography p={1} pb={0} variant="h6" fontWeight={600}>
                    Feature settings
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box p={1} mt={1} display="flex" flexDirection="column">
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                checked={generatedParametricData.enabled}
                                name="generated-parametric-data"
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setGeneratedParametricData({ enabled: checked }))
                                }
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                Generated parametric data
                            </Box>
                        }
                    />
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <Switch
                                checked={navigationCube.enabled}
                                name="navigation-cube"
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setNavigationCube({ enabled: checked }))
                                }
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
                                checked={debugStats.enabled}
                                name="debug-stats"
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setDebugStats({ enabled: checked }))
                                }
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
                                                        name={widget.key}
                                                        checked={
                                                            enabledWidgets.some(
                                                                (enabled) => enabled.key === widget.key
                                                            ) && !lockedWidgets.includes(widget.key)
                                                        }
                                                        onChange={(_e, checked) => toggleWidget(widget.key, checked)}
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

                                <Select
                                    readOnly
                                    disabled
                                    value={featuresConfig.home.key}
                                    inputProps={{
                                        id: "primary-menu-button-1",
                                    }}
                                >
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
                                    inputProps={{
                                        id: "primary-menu-button-2",
                                    }}
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
                                    inputProps={{
                                        id: "primary-menu-button-3",
                                    }}
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
                                    inputProps={{
                                        id: "primary-menu-button-4",
                                    }}
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
                                        id="primary-menu-button-5-label"
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
                                    labelId="primary-menu-button-5-label"
                                    inputProps={{
                                        id: "primary-menu-button-5",
                                    }}
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
                <Accordion>
                    <AccordionSummary>Context menu</AccordionSummary>
                    <AccordionDetails>
                        <Grid container p={1}>
                            {[...canvasContextMenuFeatures]
                                .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }))
                                .map((feature) => (
                                    <Grid item xs={6} key={feature.key}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    name={feature.key}
                                                    color="primary"
                                                    checked={enabledCanvasContextMenuFeatures.some(
                                                        (enabled) => enabled === feature.key
                                                    )}
                                                    onChange={(_e, checked) => {
                                                        toggleCanvasContextMenuFeature(feature.key, checked);
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box mr={0.5} sx={{ userSelect: "none" }}>
                                                    {feature.name}
                                                </Box>
                                            }
                                        />
                                    </Grid>
                                ))}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            </ScrollBox>
        </>
    );
}
