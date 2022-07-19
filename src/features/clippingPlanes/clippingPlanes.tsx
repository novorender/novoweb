import { Box, Checkbox, FormControlLabel, Slider } from "@mui/material";
import { useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { Picker, renderActions, selectClippingPlanes, selectPicker } from "slices/renderSlice";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

export function ClippingPlanes() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingPlanes.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.clippingPlanes.key;
    const defining = useAppSelector(selectPicker) === Picker.ClippingPlane;
    const { enabled, planes, baseW } = useAppSelector(selectClippingPlanes);
    const [enableOptions, setEnableOptions] = useState(enabled || planes.length > 0 || defining);
    const dispatch = useAppDispatch();

    const toggleDefineNew = () => {
        if (!enableOptions) {
            setEnableOptions(true);
        }

        if (defining) {
            dispatch(renderActions.setPicker(Picker.Object));
            return;
        }

        dispatch(renderActions.setPicker(Picker.ClippingPlane));
        dispatch(
            renderActions.setClippingPlanes({
                planes: [],
                enabled: true,
            })
        );
    };

    const handleSliderChange = (_event: Event, newValue: number | number[]) => {
        const plane = Array.from(planes[0]) as [number, number, number, number];
        plane[3] = typeof newValue === "number" ? newValue : newValue[0];

        dispatch(renderActions.setClippingPlanes({ planes: [plane] }));
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.clippingPlanes}>
                    {!menuOpen && !minimized ? (
                        <>
                            <Box mt={1} mb={1} display="flex" justifyContent="space-between">
                                <FormControlLabel
                                    disabled={!enableOptions || defining}
                                    control={
                                        <Checkbox
                                            size="small"
                                            color="primary"
                                            checked={enabled}
                                            onChange={() =>
                                                dispatch(renderActions.setClippingPlanes({ enabled: !enabled }))
                                            }
                                        />
                                    }
                                    label={<Box mr={0.5}>Enable</Box>}
                                />
                            </Box>
                            <FormControlLabel
                                sx={{ marginLeft: 0 }}
                                control={<IosSwitch checked={defining} color="primary" onChange={toggleDefineNew} />}
                                labelPlacement="start"
                                label={<div>Create clipping plane</div>}
                            />
                        </>
                    ) : null}
                </WidgetHeader>
                {planes.length && !menuOpen ? (
                    <Box p={1} mt={2}>
                        Position:
                        <Slider
                            min={baseW - 20}
                            step={0.1}
                            max={baseW + 20}
                            value={planes[0][3]}
                            onChange={handleSliderChange}
                        />
                    </Box>
                ) : null}
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.clippingPlanes.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.clippingPlanes.key}-widget-menu-fab`}
            />
        </>
    );
}
