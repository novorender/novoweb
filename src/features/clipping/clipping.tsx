import { Box, FormControlLabel, useTheme, Checkbox } from "@material-ui/core";
import { useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components/iosSwitch";
import { renderActions, selectClippingPlanes } from "slices/renderSlice";

const axisNames = ["-X", "-Y", "-Z", "+X", "+Y", "+Z"];

export function Clipping() {
    const theme = useTheme();

    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const { defining, enabled, showBox, inside } = clippingPlanes;
    const dispatch = useAppDispatch();

    const [enableOptions, setEnableOptions] = useState(enabled || showBox || defining);

    const toggle = (func: "enabled" | "showBox" | "inside") => () => {
        return dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, [func]: !clippingPlanes[func] }));
    };

    const toggleDefineNew = () => {
        if (!enableOptions) {
            setEnableOptions(true);
        }

        if (clippingPlanes.defining) {
            return dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, defining: false }));
        }

        dispatch(
            renderActions.setClippingPlanes({
                ...clippingPlanes,
                enabled: true,
                showBox: true,
                defining: true,
                highlight: -1,
            })
        );
    };

    return (
        <Box p={1} boxShadow={theme.customShadows.widgetHeader}>
            <Box mt={1} mb={1} display="flex" justifyContent="space-between">
                <FormControlLabel
                    disabled={!enableOptions}
                    control={<Checkbox size="small" color="primary" checked={enabled} onChange={toggle("enabled")} />}
                    label={<Box mr={0.5}>Enable</Box>}
                />
                <FormControlLabel
                    disabled={!enableOptions}
                    control={<Checkbox size="small" color="primary" checked={showBox} onChange={toggle("showBox")} />}
                    label={
                        <Box mr={0.5}>
                            Show box{" "}
                            {showBox && clippingPlanes.highlight !== -1
                                ? `(${axisNames[clippingPlanes.highlight]})`
                                : ""}
                        </Box>
                    }
                />
                <FormControlLabel
                    disabled={!enableOptions}
                    control={<Checkbox size="small" color="primary" checked={inside} onChange={toggle("inside")} />}
                    label={<Box>Inside</Box>}
                />
            </Box>
            <FormControlLabel
                style={{ marginLeft: 0 }}
                control={<IosSwitch checked={defining} color="primary" onChange={toggleDefineNew} />}
                labelPlacement="start"
                label={<Box>Create clipping box</Box>}
            />
        </Box>
    );
}
