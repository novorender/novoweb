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
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary, Divider, LinearProgress, ScrollBox, Switch } from "components";
import { CanvasContextMenuFeatureKey, canvasContextMenuFeatures } from "config/canvasContextMenu";
import {
    betaViewerWidgets,
    ButtonKey,
    defaultEnabledWidgets,
    featuresConfig,
    releasedViewerWidgets,
    Widget,
    WidgetKey,
} from "config/features";
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
    const { t, i18n } = useTranslation();

    const dispatch = useAppDispatch();
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const primaryMenu = useAppSelector(selectPrimaryMenu);
    const enabledCanvasContextMenuFeatures = useAppSelector(selectCanvasContextMenuFeatures);
    const navigationCube = useAppSelector(selectNavigationCube);
    const debugStats = useAppSelector(selectDebugStats);
    const allowGeneratedParametric = useAppSelector(selectGeneratedParametricData);

    const toggleWidget = (key: WidgetKey, checked: boolean) => {
        const keys = enabledWidgets.map((w) => w.key);

        dispatch(explorerActions.setEnabledWidgets(checked ? keys.concat(key) : keys.filter((k) => k !== key)));
    };

    const toggleCanvasContextMenuFeature = (key: CanvasContextMenuFeatureKey, checked: boolean) => {
        const keys = enabledCanvasContextMenuFeatures;
        dispatch(
            explorerActions.setCanvasContextMenu({
                features: checked ? keys.concat(key) : keys.filter((k) => k !== key),
            }),
        );
    };

    const sortWidgets = (widgets: Widget[]) =>
        widgets.sort(
            (a, b) =>
                t(b.nameKey).localeCompare(t(b.nameKey), i18n.language, { sensitivity: "accent" }) +
                ((lockedWidgets.includes(a.key) && lockedWidgets.includes(b.key)) ||
                (!lockedWidgets.includes(a.key) && !lockedWidgets.includes(b.key))
                    ? 0
                    : lockedWidgets.includes(a.key)
                      ? 100
                      : -100),
        );

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
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
                    {t("featureSettings")}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box p={1} mt={1} display="flex" flexDirection="column">
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
                                {t("navigationCube")}
                            </Box>
                        }
                    />
                    <Divider />
                </Box>
                <Accordion>
                    <AccordionSummary>{t("widgets")}</AccordionSummary>
                    <AccordionDetails>
                        <Grid container p={1}>
                            {sortWidgets([...releasedViewerWidgets]).map((widget) =>
                                defaultEnabledWidgets.includes(widget.key) ? null : (
                                    <Grid item xs={6} key={widget.key}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    color="primary"
                                                    name={widget.key}
                                                    checked={
                                                        enabledWidgets.some((enabled) => enabled.key === widget.key) &&
                                                        !lockedWidgets.includes(widget.key)
                                                    }
                                                    onChange={(_e, checked) => toggleWidget(widget.key, checked)}
                                                    disabled={lockedWidgets.includes(widget.key)}
                                                />
                                            }
                                            label={
                                                <Box mr={0.5} sx={{ userSelect: "none" }}>
                                                    {t(widget.nameKey)}
                                                </Box>
                                            }
                                        />
                                    </Grid>
                                ),
                            )}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary>{t("primaryMenu")}</AccordionSummary>
                    <AccordionDetails>
                        <Box px={1}>
                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-1"}
                                    >
                                        {t("button1")}
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
                                    <MenuItem value={featuresConfig.home.key}>
                                        {t(featuresConfig.home.nameKey)}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-2"}
                                    >
                                        {t("button2")}
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
                                        {t(featuresConfig.cameraSpeed.nameKey)}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-3"}
                                    >
                                        {t("button3")}
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
                                        {t(featuresConfig.flyToSelected.nameKey)}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        htmlFor={"primary-menu-button-4"}
                                    >
                                        {t("button4")}
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
                                        {t(featuresConfig.stepBack.nameKey)}
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                        id="primary-menu-button-5-label"
                                    >
                                        {t("button5")}
                                    </FormLabel>
                                </Box>

                                <Select
                                    onChange={(e) => {
                                        dispatch(
                                            explorerActions.setPrimaryMenu({
                                                button5: e.target.value as ButtonKey,
                                            }),
                                        );
                                    }}
                                    value={primaryMenu.button5}
                                    labelId="primary-menu-button-5-label"
                                    inputProps={{
                                        id: "primary-menu-button-5",
                                    }}
                                >
                                    <MenuItem value={featuresConfig.orthoShortcut.key}>
                                        {t(featuresConfig.orthoShortcut.nameKey)}
                                    </MenuItem>
                                    <MenuItem value={featuresConfig.stepForwards.key}>
                                        {t(featuresConfig.stepForwards.nameKey)}
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary>{t("contextMenu")}</AccordionSummary>
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
                                                        (enabled) => enabled === feature.key,
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
                <Accordion>
                    <AccordionSummary>Beta</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} mt={1} display="flex" flexDirection="column">
                            <FormControlLabel
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        checked={allowGeneratedParametric.enabled}
                                        name="generated-parametric-data"
                                        onChange={(_evt, checked) =>
                                            dispatch(renderActions.setGeneratedParametricData({ enabled: checked }))
                                        }
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("generatedParametricData")}
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
                                        {t("performanceStats")}
                                    </Box>
                                }
                            />
                            {sortWidgets([...betaViewerWidgets]).map((widget) => (
                                <FormControlLabel
                                    key={widget.key}
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            checked={
                                                enabledWidgets.some((enabled) => enabled.key === widget.key) &&
                                                !lockedWidgets.includes(widget.key)
                                            }
                                            onChange={(_e, checked) => toggleWidget(widget.key, checked)}
                                            disabled={lockedWidgets.includes(widget.key)}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t(widget.nameKey)}
                                        </Box>
                                    }
                                />
                            ))}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </ScrollBox>
        </>
    );
}
