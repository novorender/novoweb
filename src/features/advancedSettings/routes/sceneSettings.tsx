import { ChangeEvent, MouseEvent, useState } from "react";
import { quat, vec3 } from "gl-matrix";
import { FlightControllerParams } from "@novorender/webgl-api";
import { useTheme, Box, Button, Autocomplete, FormControlLabel } from "@mui/material";
import { useHistory } from "react-router-dom";
import { ArrowBack, ColorLens, Save } from "@mui/icons-material";

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    LinearProgress,
    ScrollBox,
    Switch,
    TextField,
} from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import {
    renderActions,
    selectEnvironments,
    selectCurrentEnvironment,
    AdvancedSetting,
    selectAdvancedSettings,
    selectSubtrees,
    SubtreeStatus,
    selectCameraType,
    CameraType,
} from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";
import { ColorPicker } from "features/colorPicker";

import { toggleTerrainAsBackground } from "../utils";

export function SceneSettings({
    save,
    saveCameraPos,
    saving,
}: {
    save: () => Promise<void>;
    saveCameraPos: (camera: Required<FlightControllerParams>) => Promise<void>;
    saving: boolean;
}) {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const environments = useAppSelector(selectEnvironments);
    const currentEnvironment = useAppSelector(selectCurrentEnvironment);
    const subtrees = useAppSelector(selectSubtrees);
    const cameraType = useAppSelector(selectCameraType);
    const settings = useAppSelector(selectAdvancedSettings);
    const { terrainAsBackground, backgroundColor } = settings;

    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };
    const { r, g, b } = vecToRgb(backgroundColor);

    const showTerrainSettings = subtrees?.terrain !== SubtreeStatus.Unavailable;

    const handleToggleTerrainAsBackground = ({ target: { checked } }: ChangeEvent<HTMLInputElement>) => {
        dispatch(renderActions.setAdvancedSettings({ [AdvancedSetting.TerrainAsBackground]: checked }));
        return toggleTerrainAsBackground(view);
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
            <ScrollBox height={1} mt={1} pb={3}>
                <Accordion>
                    <AccordionSummary>Environment</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <Autocomplete
                                id="scene-environment"
                                fullWidth
                                options={environments}
                                getOptionLabel={(env) =>
                                    env.name[0].toUpperCase() + env.name.slice(1).replaceAll("_", " ")
                                }
                                value={currentEnvironment}
                                isOptionEqualToValue={(option, value) => option.name === value.name}
                                onChange={(_e, value) => {
                                    if (value) {
                                        dispatch(renderActions.setEnvironment(value));
                                    }
                                }}
                                size="small"
                                renderInput={(params) => <TextField {...params} label="Environment" />}
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>
                {showTerrainSettings ? (
                    <Accordion>
                        <AccordionSummary>Terrain</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            name={AdvancedSetting.TerrainAsBackground}
                                            checked={terrainAsBackground}
                                            onChange={handleToggleTerrainAsBackground}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Render terrain as background
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                <Box p={1} mt={1}>
                    <Box>
                        <Button sx={{ mb: 2 }} variant="outlined" color="grey" onClick={toggleColorPicker}>
                            <ColorLens sx={{ mr: 1, color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                            2D background color
                        </Button>
                    </Box>
                    <Button
                        disabled={cameraType !== CameraType.Flight}
                        variant="outlined"
                        color="grey"
                        onClick={async () => {
                            if (view.camera.controller.params.kind === "flight") {
                                await saveCameraPos(view.camera.controller.params);
                                dispatch(
                                    renderActions.setHomeCameraPos({
                                        position: vec3.clone(view.camera.position),
                                        rotation: quat.clone(view.camera.rotation),
                                    })
                                );
                            }
                        }}
                    >
                        Save default camera position
                    </Button>
                </Box>
            </ScrollBox>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={backgroundColor}
                onChangeComplete={({ rgb }) => {
                    const rgba = rgbToVec(rgb) as VecRGBA;
                    view.applySettings({ background: { color: rgba } });
                    dispatch(
                        renderActions.setAdvancedSettings({
                            [AdvancedSetting.BackgroundColor]: rgba,
                        })
                    );
                }}
            />
        </>
    );
}
