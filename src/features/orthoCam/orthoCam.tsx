import { ChangeEvent, useState, MouseEvent } from "react";
import { Box, Button, FormControlLabel } from "@mui/material";
import { ArrowDownward, ColorLens } from "@mui/icons-material";
import { vec3 } from "gl-matrix";

import { api } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, ScrollBox, Switch, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { toggleTerrainAsBackground } from "features/advancedSettings";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";

import {
    AdvancedSetting,
    CameraType,
    renderActions,
    selectAdvancedSettings,
    selectCameraType,
    selectSubtrees,
    SubtreeStatus,
    selectGrid,
    selectPicker,
    Picker,
} from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { ColorPicker } from "features/colorPicker";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";

export function OrthoCam() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.orthoCam.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.orthoCam.key;
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);

    const grid = useAppSelector(selectGrid);
    const cameraType = useAppSelector(selectCameraType);
    const selectingOrthoPoint = useAppSelector(selectPicker) === Picker.OrthoPlane;
    const { terrainAsBackground } = useAppSelector(selectAdvancedSettings);
    const subtrees = useAppSelector(selectSubtrees);
    const backgroundColor = useAppSelector(selectAdvancedSettings).backgroundColor;
    const dispatch = useAppDispatch();

    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };
    const { r, g, b } = vecToRgb(backgroundColor);

    const togglePick = () => {
        if (cameraType === CameraType.Orthographic || selectingOrthoPoint) {
            dispatch(renderActions.setPicker(Picker.Object));
            dispatch(renderActions.setCamera({ type: CameraType.Flight }));
        } else {
            dispatch(renderActions.setPicker(Picker.OrthoPlane));
        }
    };

    const toggleTerrain = (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        dispatch(renderActions.setAdvancedSettings({ [AdvancedSetting.TerrainAsBackground]: checked }));
        toggleTerrainAsBackground(view);
    };

    const toggleGrid = (_e: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        dispatch(renderActions.setGridDefaults({ enabled: checked }));
        dispatch(renderActions.setGrid({ enabled: checked }));
    };

    const handleTopDown = () => {
        const bs = view.scene?.boundingSphere;
        const maxY = bs ? bs.center[1] + bs?.radius : 10000;
        const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
        const pos = vec3.copy(vec3.create(), view.camera.position);
        pos[1] = Math.min(pos[1], maxY);
        (orthoController as any).init(pos, [0, 1, 0], view.camera);
        const mat = (orthoController.params as any).referenceCoordSys;

        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                params: {
                    kind: "ortho",
                    referenceCoordSys: mat,
                    fieldOfView: 100,
                    near: -0.001,
                    far: (view.camera.controller.params as any).far,
                },
            })
        );
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.orthoCam}>
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
                                    name={AdvancedSetting.TerrainAsBackground}
                                    checked={terrainAsBackground}
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
                            <FormControlLabel
                                sx={{ ml: 0, mb: 2 }}
                                control={<Switch name={"Show grid"} checked={grid.enabled} onChange={toggleGrid} />}
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Show grid
                                    </Box>
                                }
                            />
                            <Box>
                                <Button variant="outlined" color="grey" onClick={toggleColorPicker}>
                                    <ColorLens sx={{ mr: 1, color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                                    Background color
                                </Button>
                            </Box>
                        </>
                    ) : null}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.orthoCam.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
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
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.orthoCam.key}-widget-menu-fab`}
            />
        </>
    );
}
