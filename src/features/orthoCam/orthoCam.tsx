import { ArrowDownward, ColorLens } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Typography } from "@mui/material";
import { ChangeEvent, MouseEvent, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LogoSpeedDial, ScrollBox, Switch, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { toggleTerrainAsBackground } from "features/advancedSettings";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";

import { ColorPicker } from "features/colorPicker";
import {
    CameraType,
    Picker,
    SubtreeStatus,
    renderActions,
    selectBackground,
    selectCameraType,
    selectGrid,
    selectPicker,
    selectSubtrees,
    selectTerrain,
} from "features/render/renderSlice";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";
import { VecRGBA, rgbToVec, vecToRgb } from "utils/color";

import { orthoCamActions, selectCurrentTopDownElevation, selectDefaultTopDownElevation } from "./orthoCamSlice";
import { getTopDownParams } from "./utils";

export default function OrthoCam() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.orthoCam.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.orthoCam.key);
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);

    const grid = useAppSelector(selectGrid);
    const cameraType = useAppSelector(selectCameraType);
    const picker = useAppSelector(selectPicker);
    const selectingCrossSection = picker === Picker.CrossSection;
    const selectingOrthoPoint = picker === Picker.OrthoPlane;
    const subtrees = useAppSelector(selectSubtrees);
    const background = useAppSelector(selectBackground);
    const terrain = useAppSelector(selectTerrain);
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);
    const currentElevation = useAppSelector(selectCurrentTopDownElevation);
    const dispatch = useAppDispatch();

    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };
    const { r, g, b } = vecToRgb(background.color);

    const togglePick = () => {
        if (cameraType === CameraType.Orthographic || selectingOrthoPoint) {
            dispatch(renderActions.setPicker(Picker.Object));
            dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
        } else {
            dispatch(renderActions.setPicker(Picker.OrthoPlane));
        }
    };

    const toggleTerrain = (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        dispatch(renderActions.setTerrain({ asBackground: checked }));
    };

    const toggleGrid = (_e: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        // dispatch(renderActions.setGridDefaults({ enabled: checked }));
        dispatch(renderActions.setGrid({ enabled: checked }));
    };

    const handleTopDown = () => {
        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                goTo: getTopDownParams({ view, elevation: defaultTopDownElevation }),
            })
        );
    };

    const handleCrossSection = (_e: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        if (checked) {
            dispatch(renderActions.setPicker(Picker.CrossSection));
        } else {
            dispatch(renderActions.setPicker(Picker.Object));
            dispatch(orthoCamActions.setCrossSectionPoint(undefined));
            dispatch(orthoCamActions.setCrossSectionHover(undefined));
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.orthoCam} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <Box mx={-1} display="flex" justifyContent="space-between">
                            <Button
                                color="grey"
                                onClick={handleTopDown}
                                disabled={cameraType === CameraType.Orthographic}
                            >
                                <ArrowDownward sx={{ mr: 1 }} />
                                Top-down
                            </Button>
                            <FormControlLabel
                                sx={{ mr: 1 }}
                                control={
                                    <IosSwitch
                                        checked={cameraType === CameraType.Orthographic || selectingOrthoPoint}
                                        color="primary"
                                        onChange={togglePick}
                                    />
                                }
                                labelPlacement="start"
                                label={<Box fontSize={14}>2D mode</Box>}
                            />
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1} pt={2}>
                    {subtrees?.terrain !== SubtreeStatus.Unavailable ? (
                        <FormControlLabel
                            sx={{ ml: 0, mb: 2 }}
                            control={
                                <Switch
                                    name={"terrain as background"}
                                    checked={terrain.asBackground}
                                    onChange={toggleTerrain}
                                />
                            }
                            label={
                                <Box ml={1} fontSize={16}>
                                    Render terrain as background
                                </Box>
                            }
                        />
                    ) : null}
                    {cameraType === CameraType.Orthographic ? (
                        <>
                            {currentElevation && (
                                <>
                                    <Typography>Elevation: {currentElevation.toFixed(3)}</Typography>
                                    <Divider sx={{ my: 1 }} />
                                </>
                            )}
                            <FormControlLabel
                                sx={{ ml: 0, mb: 2 }}
                                control={<Switch name={"Show grid"} checked={grid.enabled} onChange={toggleGrid} />}
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Show grid
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                sx={{ ml: 0, mb: 2 }}
                                control={
                                    <Switch
                                        name="Cross section"
                                        checked={selectingCrossSection}
                                        color="primary"
                                        onChange={handleCrossSection}
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Select cross section
                                    </Box>
                                }
                            />
                            <Box mb={1}></Box>
                            <Box>
                                <Button
                                    variant="outlined"
                                    color="grey"
                                    onClick={toggleColorPicker}
                                    sx={{ minWidth: 175, display: "flex", justifyContent: "flex-start" }}
                                >
                                    <ColorLens sx={{ mr: 1, color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                                    Background color
                                </Button>
                            </Box>
                        </>
                    ) : null}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.orthoCam.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={background.color}
                onChangeComplete={({ rgb }) => {
                    const rgba = rgbToVec(rgb) as VecRGBA;
                    dispatch(
                        renderActions.setBackground({
                            color: rgba,
                        })
                    );
                }}
            />
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
