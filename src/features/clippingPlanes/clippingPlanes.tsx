import { Box, Checkbox, FormControlLabel, Slider } from "@mui/material";
import { SyntheticEvent, useEffect, useState } from "react";
import { vec4 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { Picker, renderActions, selectClippingPlanes, selectPicker } from "slices/renderSlice";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function ClippingPlanes() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingPlanes.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.clippingPlanes.key;
    const defining = useAppSelector(selectPicker) === Picker.ClippingPlane;
    const { enabled, planes, baseW } = useAppSelector(selectClippingPlanes);
    const [enableOptions, setEnableOptions] = useState(enabled || planes.length > 0 || defining);
    const dispatch = useAppDispatch();
    const [sliderVal, setSliderVal] = useState(0);

    useEffect(() => {
        if (planes[0]) {
            setSliderVal(planes[0][3]);
        }
    }, [planes]);

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
        const plane = planes[0] ? vec4.clone(planes[0]) : undefined;

        if (!plane) {
            return;
        }

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        plane[3] = typeof newValue === "number" ? newValue : newValue[0];
        setSliderVal(newVal);

        view.applySettings({
            clippingVolume: {
                ...view.settings.clippingVolume,
                planes: [plane],
            },
        });
    };

    const handleSliderChangeCommitted = (
        _event: Event | SyntheticEvent<Element, Event>,
        newValue: number | number[]
    ) => {
        const plane = planes[0] ? vec4.clone(planes[0]) : undefined;

        if (!plane) {
            return;
        }

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        plane[3] = newVal;

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
                            value={sliderVal}
                            onChange={handleSliderChange}
                            onChangeCommitted={handleSliderChangeCommitted}
                        />
                    </Box>
                ) : null}
                {menuOpen && <WidgetList widgetKey={featuresConfig.clippingPlanes.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.clippingPlanes.key}-widget-menu-fab`}
            />
        </>
    );
}
