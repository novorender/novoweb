import { Box, FormControlLabel, Checkbox, Slider } from "@mui/material";
import { SyntheticEvent, useEffect, useState } from "react";
import { vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components/iosSwitch";
import { renderActions, selectClippingBox } from "features/render/renderSlice";
import { LogoSpeedDial, ReverseSlider, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import WidgetList from "features/widgetList/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

const axisNames = ["-X", "-Z", "-Y", "+X", "+Z", "+Y"];

export default function ClippingBox() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const clippingBox = useAppSelector(selectClippingBox);
    const { defining, enabled, showBox, inside, baseBounds } = clippingBox;
    const dispatch = useAppDispatch();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingBox.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.clippingBox.key;
    const [enableOptions, setEnableOptions] = useState(enabled || showBox || defining);
    const [sliderValues, setSliderValues] = useState([...baseBounds.min, ...baseBounds.max]);

    useEffect(() => {
        setSliderValues([...baseBounds.min, ...baseBounds.max]);
    }, [baseBounds]);

    const toggle = (func: "enabled" | "showBox" | "inside") => () => {
        return dispatch(renderActions.setClippingBox({ ...clippingBox, [func]: !clippingBox[func] }));
    };

    const toggleDefineNew = () => {
        if (!enableOptions) {
            setEnableOptions(true);
        }

        if (clippingBox.defining) {
            return dispatch(renderActions.setClippingBox({ ...clippingBox, defining: false }));
        }

        dispatch(
            renderActions.setClippingBox({
                ...clippingBox,
                enabled: true,
                showBox: true,
                defining: true,
                highlight: -1,
            })
        );
    };

    const handleSliderChange = (plane: number) => (_event: Event, newValue: number | number[]) => {
        if (plane < 0 || plane > 5) {
            return;
        }

        const val = typeof newValue === "number" ? newValue : newValue[0];
        setSliderValues((state) => {
            const updated = state.map((v, idx) => (idx === plane ? val : v));
            view.applySettings({
                clippingPlanes: {
                    ...view.settings.clippingPlanes,
                    bounds: {
                        min: vec3.fromValues(updated[0], updated[1], updated[2]),
                        max: vec3.fromValues(updated[3], updated[4], updated[5]),
                    },
                },
            });
            return updated;
        });
    };

    const handleSliderChangeCommitted =
        (plane: number) => (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
            if (plane < 0 || plane > 5) {
                return;
            }

            const val = typeof newValue === "number" ? newValue : newValue[0];
            const updated = sliderValues.map((v, idx) => (idx === plane ? val : v));
            dispatch(
                renderActions.setClippingBox({
                    bounds: {
                        min: vec3.fromValues(updated[0], updated[1], updated[2]),
                        max: vec3.fromValues(updated[3], updated[4], updated[5]),
                    },
                })
            );
        };

    const flatBaseBounds = [...baseBounds.min, ...baseBounds.max];
    const disableSliders = !enabled || !flatBaseBounds.some((val) => val !== 0);
    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.clippingBox} disableShadow={menuOpen}>
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
                                            onChange={toggle("enabled")}
                                        />
                                    }
                                    label={<Box mr={0.5}>Enable</Box>}
                                />
                                <FormControlLabel
                                    disabled={!enableOptions || defining}
                                    control={
                                        <Checkbox
                                            size="small"
                                            color="primary"
                                            checked={showBox}
                                            onChange={toggle("showBox")}
                                        />
                                    }
                                    label={<Box mr={0.5}>Show box</Box>}
                                />
                                <FormControlLabel
                                    disabled={!enableOptions}
                                    control={
                                        <Checkbox
                                            size="small"
                                            color="primary"
                                            checked={inside}
                                            onChange={toggle("inside")}
                                        />
                                    }
                                    label={<Box>Inside</Box>}
                                />
                            </Box>
                            <FormControlLabel
                                sx={{ marginLeft: 0 }}
                                control={<IosSwitch checked={defining} color="primary" onChange={toggleDefineNew} />}
                                labelPlacement="start"
                                label={<Box>Create clipping box</Box>}
                            />
                        </>
                    ) : null}
                </WidgetHeader>
                <ScrollBox p={1} pb={3} display={menuOpen || minimized ? "none" : "block"}>
                    {[0, 3, 2, 5, 1, 4].map((plane) => {
                        const sliderProps = {
                            min: flatBaseBounds[plane] - 20,
                            step: 0.1,
                            max: flatBaseBounds[plane] + 20,
                            value: sliderValues[plane],
                            onChange: handleSliderChange(plane),
                            onChangeCommitted: handleSliderChangeCommitted(plane),
                            disabled: disableSliders,
                        };

                        return (
                            <Box
                                key={plane}
                                mt={1}
                                onMouseEnter={() => {
                                    if (!disableSliders) {
                                        dispatch(renderActions.setClippingBox({ highlight: plane }));
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (!disableSliders) {
                                        dispatch(renderActions.setClippingBox({ highlight: -1 }));
                                    }
                                }}
                            >
                                Position ({axisNames[plane]}):
                                {plane < 3 ? <ReverseSlider {...sliderProps} /> : <Slider {...sliderProps} />}
                            </Box>
                        );
                    })}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.clippingBox.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.clippingBox.key}-widget-menu-fab`}
            />
        </>
    );
}
