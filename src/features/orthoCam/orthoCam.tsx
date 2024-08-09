import { ArrowDownward, ColorLens } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Slider, Typography } from "@mui/material";
import { ChangeEvent, MouseEvent, SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, IosSwitch, LogoSpeedDial, ScrollBox, Switch, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ColorPicker } from "features/colorPicker";
import {
    CameraType,
    Picker,
    renderActions,
    selectBackground,
    selectCameraType,
    selectGrid,
    selectPicker,
    selectSubtrees,
    selectTerrain,
    selectViewMode,
    SubtreeStatus,
} from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { ViewMode } from "types/misc";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";

import {
    orthoCamActions,
    selectCrossSectionClipping,
    selectCurrentTopDownElevation,
    selectDefaultTopDownElevation,
    selectTopDownSnapToAxis,
} from "./orthoCamSlice";
import { getTopDownParams } from "./utils";

export default function OrthoCam() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.orthoCam.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.orthoCam.key);
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const grid = useAppSelector(selectGrid);
    const cameraType = useAppSelector(selectCameraType);
    const picker = useAppSelector(selectPicker);
    const selectingCrossSection = picker === Picker.CrossSection;
    const selectingOrthoPoint = picker === Picker.OrthoPlane;
    const subtrees = useAppSelector(selectSubtrees);
    const background = useAppSelector(selectBackground);
    const terrain = useAppSelector(selectTerrain);
    const snapToNearestAxis = useAppSelector(selectTopDownSnapToAxis) === undefined;
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);
    const currentElevation = useAppSelector(selectCurrentTopDownElevation);
    const viewMode = useAppSelector(selectViewMode);
    const crossSectionClipping = useAppSelector(selectCrossSectionClipping);
    const dispatch = useAppDispatch();

    const [clipping, setClipping] = useState(crossSectionClipping);

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
        dispatch(renderActions.setGrid({ enabled: checked }));
    };

    const handleTopDown = () => {
        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                goTo: getTopDownParams({ view, elevation: defaultTopDownElevation, snapToNearestAxis }),
            }),
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

    const handleClippingChange = (_event: Event, newValue: number | number[]) => {
        if (Array.isArray(newValue) || view.renderState.camera.kind !== "orthographic") {
            return;
        }

        setClipping(newValue);
        view.modifyRenderState({ camera: { far: newValue } });
    };

    const handleClippingCommit = (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
        if (Array.isArray(newValue) || view.renderState.camera.kind !== "orthographic") {
            return;
        }

        dispatch(orthoCamActions.setCrossSectionClipping(newValue));
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
                                {t("top-Down")}
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
                                label={<Box fontSize={14}>{t("2DMode")}</Box>}
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
                                    {t("renderTerrainAsBackground")}
                                </Box>
                            }
                        />
                    ) : null}
                    {cameraType === CameraType.Orthographic ? (
                        <>
                            {currentElevation && (
                                <>
                                    <Typography>
                                        {t("elevation:")}
                                        {currentElevation.toFixed(3)}
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                </>
                            )}
                            <FormControlLabel
                                sx={{ ml: 0, mb: 2 }}
                                control={<Switch name={"Show grid"} checked={grid.enabled} onChange={toggleGrid} />}
                                label={
                                    <Box ml={1} fontSize={16}>
                                        {t("showGrid")}
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
                                        {t("selectCrossSection")}
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
                                    {t("backgroundColor")}
                                </Button>
                            </Box>

                            {viewMode === ViewMode.CrossSection && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography>
                                        {t("clipping:")}
                                        {clipping} {t("m")}
                                    </Typography>
                                    <Box mx={2}>
                                        <Slider
                                            getAriaLabel={() => "Clipping far"}
                                            value={clipping}
                                            min={0.001}
                                            max={1}
                                            step={0.01}
                                            onChange={handleClippingChange}
                                            onChangeCommitted={handleClippingCommit}
                                            valueLabelDisplay="off"
                                        />
                                    </Box>
                                </>
                            )}
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
                disableAlpha
                onChangeComplete={({ rgb }) => {
                    const rgba = rgbToVec(rgb) as VecRGBA;
                    dispatch(
                        renderActions.setBackground({
                            color: rgba,
                        }),
                    );
                }}
            />
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
