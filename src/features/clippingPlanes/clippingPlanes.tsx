import { Box, Checkbox, FormControlLabel, Slider, useTheme } from "@mui/material";
import { useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components";
import { renderActions, selectClippingPlanes } from "slices/renderSlice";

export function ClippingPlanes() {
    const theme = useTheme();
    const { defining, enabled, planes, baseW } = useAppSelector(selectClippingPlanes);
    const [enableOptions, setEnableOptions] = useState(enabled || planes.length > 0 || defining);
    const dispatch = useAppDispatch();

    const toggleDefineNew = () => {
        if (!enableOptions) {
            setEnableOptions(true);
        }

        if (defining) {
            return dispatch(renderActions.setClippingPlanes({ defining: false }));
        }

        dispatch(
            renderActions.setClippingPlanes({
                planes: [],
                enabled: true,
                defining: true,
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
            <Box p={1} boxShadow={theme.customShadows.widgetHeader}>
                <Box mt={1} mb={1} display="flex" justifyContent="space-between">
                    <FormControlLabel
                        disabled={!enableOptions || defining}
                        control={
                            <Checkbox
                                size="small"
                                color="primary"
                                checked={enabled}
                                onChange={() => dispatch(renderActions.setClippingPlanes({ enabled: !enabled }))}
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
            </Box>
            {planes.length ? (
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
        </>
    );
}
