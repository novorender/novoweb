import { Box, FormControlLabel, Checkbox } from "@mui/material";
import { useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components/iosSwitch";
import { renderActions, selectClippingBox } from "slices/renderSlice";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

const axisNames = ["-X", "-Y", "-Z", "+X", "+Y", "+Z"];

export function ClippingBox() {
    const clippingBox = useAppSelector(selectClippingBox);
    const { defining, enabled, showBox, inside } = clippingBox;
    const dispatch = useAppDispatch();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingBox.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.clippingBox.key;
    const [enableOptions, setEnableOptions] = useState(enabled || showBox || defining);

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

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.clippingBox}>
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
                                    label={
                                        <Box mr={0.5}>
                                            Show box{" "}
                                            {showBox && clippingBox.highlight !== -1
                                                ? `(${axisNames[clippingBox.highlight]})`
                                                : ""}
                                        </Box>
                                    }
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
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.clippingBox.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.clippingBox.key}-widget-menu-fab`}
            />
        </>
    );
}
