import { ArrowBack, ColorLens, Save } from "@mui/icons-material";
import { Autocomplete, Box, Button, FormControlLabel, Slider, Typography, useTheme } from "@mui/material";
import { quat, vec3 } from "gl-matrix";
import { MouseEvent, SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    AccordionDetails,
    AccordionSummary,
    Divider,
    LinearProgress,
    Switch,
    TextField,
    WidgetBottomScrollBox,
} from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ColorPicker } from "features/colorPicker";
import {
    renderActions,
    selectAdvanced,
    selectBackground,
    selectSubtrees,
    selectTerrain,
    selectViewMode,
    SubtreeStatus,
} from "features/render";
import { getAsyncStateData, ViewMode } from "types/misc";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";

import { AdvSettingsAccordion as Accordion } from "../components/advSettingsAccordion";

export function SceneSettings({
    save,
    saveCameraPos,
    saving,
}: {
    save: () => Promise<void>;
    saveCameraPos: (camera: {
        kind: "pinhole" | "orthographic";
        position: vec3;
        rotation: quat;
        fov: number;
    }) => Promise<void>;
    saving: boolean;
}) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const dispatch = useAppDispatch();
    const viewMode = useAppSelector(selectViewMode);
    const subtrees = useAppSelector(selectSubtrees);
    const background = useAppSelector(selectBackground);
    const terrain = useAppSelector(selectTerrain);
    const advanced = useAppSelector(selectAdvanced);

    const [blur, setBlur] = useState(background.blur);
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const handleBlurChange = (_event: Event, value: number | number[]): void => {
        if (Array.isArray(value)) {
            return;
        }

        setBlur(value);
        view.modifyRenderState({ background: { blur: value } });
    };

    const handleBlurCommit = (_event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
        if (Array.isArray(value)) {
            return;
        }

        dispatch(renderActions.setBackground({ blur: value }));
    };

    const showTerrainSettings = subtrees?.terrain !== SubtreeStatus.Unavailable;
    const { r, g, b } = vecToRgb(background.color);
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
                    <Button sx={{ ml: "auto" }} onClick={save} color="grey" disabled={saving}>
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
            <WidgetBottomScrollBox height={1} mt={1} pb={3}>
                <Typography p={1} pb={0} variant="h6" fontWeight={600}>
                    {t("sceneSettings")}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Accordion id="settings-scene-environment">
                    <AccordionSummary>{t("environment")}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} pr={3} display="flex" flexDirection="column">
                            <Autocomplete
                                id="scene-environment"
                                fullWidth
                                options={
                                    getAsyncStateData(background.environments)?.map((env) => env.url) ??
                                    ([] as string[])
                                }
                                getOptionLabel={(url) => {
                                    const env = getAsyncStateData(background.environments)?.find((e) => e.url === url);

                                    if (!env) {
                                        return url.split("/").at(-1) ?? url;
                                    }

                                    return env.name[0].toUpperCase() + env.name.slice(1).replaceAll("_", " ");
                                }}
                                value={background.url}
                                isOptionEqualToValue={(option, value) => option === value}
                                onChange={(_e, value) => {
                                    if (value) {
                                        dispatch(renderActions.setBackground({ url: value }));
                                    }
                                }}
                                size="small"
                                renderInput={(params) => <TextField {...params} label="Environment" />}
                            />
                        </Box>
                        <Box id="scene-blur" display="flex" alignItems="center" sx={{ p: 1, mb: 2 }}>
                            <Typography
                                sx={{
                                    minWidth: 50,
                                    flexShrink: 0,
                                }}
                            >
                                {t("blur")}
                            </Typography>
                            <Slider
                                sx={{ mx: 2, flex: "1 1 100%" }}
                                min={0}
                                max={1}
                                step={0.01}
                                value={blur}
                                valueLabelDisplay="auto"
                                onChange={handleBlurChange}
                                onChangeCommitted={handleBlurCommit}
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>
                {showTerrainSettings ? (
                    <Accordion id="settings-scene-object-picking">
                        <AccordionSummary>{t("terrain")}</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            name={"render-terrain-as-background"}
                                            checked={terrain.asBackground}
                                            onChange={(_evt, checked) =>
                                                dispatch(renderActions.setTerrain({ asBackground: checked }))
                                            }
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            {t("renderTerrainAsBackground")}
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                <Accordion id="settings-scene-object-picking">
                    <AccordionSummary>{t("objectPicking")}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <FormControlLabel
                                id="scene-pick-semi-transparent-objects"
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        checked={advanced.pick.opacityThreshold < 1}
                                        name="pick-semi-transparent-objects"
                                        onChange={(_evt, checked) =>
                                            dispatch(
                                                renderActions.setAdvanced({
                                                    pick: { opacityThreshold: checked ? 0.1 : 1 },
                                                }),
                                            )
                                        }
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("pickSemiTransparentObjects")}
                                    </Box>
                                }
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>
                <Box p={1} mt={1}>
                    <Box>
                        <Button
                            id="scene-2d-background-color"
                            sx={{ mb: 2 }}
                            variant="outlined"
                            color="grey"
                            onClick={toggleColorPicker}
                        >
                            <ColorLens sx={{ mr: 1, color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                            {t("2dBackgroundColor")}
                        </Button>
                    </Box>
                    <Button
                        id="scene-save-default-camera-position"
                        disabled={saving || viewMode === ViewMode.Panorama}
                        variant="outlined"
                        color="grey"
                        onClick={async () => {
                            if (saving || view.activeController.kind === "panorama") {
                                return;
                            }

                            await saveCameraPos({
                                kind: view.renderState.camera.kind,
                                position: vec3.clone(view.renderState.camera.position),
                                rotation: quat.clone(view.renderState.camera.rotation),
                                fov: view.renderState.camera.fov,
                            });
                        }}
                    >
                        {t("saveDefaultCameraPosition")}
                    </Button>
                </Box>
            </WidgetBottomScrollBox>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={background.color}
                onChangeComplete={({ rgb }) => {
                    const color = rgbToVec(rgb) as VecRGBA;
                    dispatch(
                        renderActions.setBackground({
                            color,
                        }),
                    );
                }}
                disableAlpha
            />
        </>
    );
}
