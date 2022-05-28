import { ChangeEvent } from "react";
import { Box, Button, FormControlLabel } from "@mui/material";
import { ArrowDownward } from "@mui/icons-material";

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
    selectSelectiongOrthoPoint,
    selectSubtrees,
    SubtreeStatus,
    selectGridDefaults,
    selectGrid,
} from "slices/renderSlice";
import { vec3 } from "gl-matrix";

export function OrthoCam() {
    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle(false);
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);

    const gridDefaults = useAppSelector(selectGridDefaults);
    const grid = useAppSelector(selectGrid);
    const cameraType = useAppSelector(selectCameraType);
    const selectingOrthoPoint = useAppSelector(selectSelectiongOrthoPoint);
    const { terrainAsBackground } = useAppSelector(selectAdvancedSettings);
    const subtrees = useAppSelector(selectSubtrees);
    const dispatch = useAppDispatch();

    const togglePick = () => {
        if (cameraType === CameraType.Orthographic || selectingOrthoPoint) {
            dispatch(renderActions.setSelectingOrthoPoint(false));
            dispatch(renderActions.setCamera({ type: CameraType.Flight }));
        } else {
            dispatch(renderActions.setSelectingOrthoPoint(true));
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
        const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
        (orthoController as any).init(view.camera.position, [0, 1, 0], view.camera);
        const mat = (orthoController.params as any).referenceCoordSys;
        const right = vec3.fromValues(mat[0], mat[1], mat[2]);
        const up = vec3.fromValues(mat[4], mat[5], mat[6]);
        const pt = vec3.fromValues(mat[12], mat[13], mat[14]);

        const squareSize = 1 * (gridDefaults.minorLineCount + 1);

        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                params: {
                    kind: "ortho",
                    referenceCoordSys: mat,
                    fieldOfView: 100,
                    near: -0.001,
                    far: 1000,
                },
            })
        );

        dispatch(
            renderActions.setGrid({
                origo: pt,
                axisY: vec3.scale(vec3.create(), up, squareSize),
                axisX: vec3.scale(vec3.create(), right, squareSize),
            })
        );
    };

    return (
        <>
            <WidgetContainer minimized={minimized}>
                <WidgetHeader minimized={minimized} toggleMinimize={toggleMinimize} widget={featuresConfig.orthoCam}>
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
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    {subtrees?.terrain !== SubtreeStatus.Unavailable ? (
                        <FormControlLabel
                            sx={{ ml: 0, mb: 1 }}
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
                        <FormControlLabel
                            sx={{ ml: 0, mb: 1 }}
                            control={<Switch name={"Show grid"} checked={grid.enabled} onChange={toggleGrid} />}
                            label={
                                <Box ml={1} fontSize={16}>
                                    Show grid
                                </Box>
                            }
                        />
                    ) : null}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.orthoCam.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.orthoCam.key}-widget-menu-fab`}
            />
        </>
    );
}
