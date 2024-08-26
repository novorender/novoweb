import { Cameraswitch, Delete } from "@mui/icons-material";
import { Box, IconButton, Slider, Typography } from "@mui/material";
import { SyntheticEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { IosSwitch } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectClippingPlanes } from "features/render";
import { rgbToHex, vecToRgb } from "utils/color";

import { MovingPlaneControl, useClippingPlaneActions } from "./useClippingPlaneActions";

export default function Planes() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const [sliders, setSliders] = useState([] as number[]);
    const { planes, outlines } = useAppSelector(selectClippingPlanes);
    const actions = useClippingPlaneActions();
    const movingPlaneControl = useRef<MovingPlaneControl>();

    useEffect(() => {
        if (planes.length) {
            setSliders(planes.map((plane) => -plane.normalOffset[3]));
        }
    }, [planes]);

    const handleSliderChange = (idx: number) => (_event: Event, newValue: number | number[]) => {
        if (!movingPlaneControl.current) {
            movingPlaneControl.current = actions.movePlane(view, planes, idx);
        }

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        movingPlaneControl.current.update(-newVal);
        setSliders((_state) => {
            const state = [..._state];
            state[idx] = newVal;
            return state;
        });
    };

    const handleSliderChangeCommitted = (_event: Event | SyntheticEvent<Element, Event>) => {
        if (!movingPlaneControl.current) {
            return;
        }

        movingPlaneControl.current.finish(true);
        movingPlaneControl.current = undefined;
    };

    const handleCameraSwap = (idx: number) => {
        actions.swapCamera(view, planes, idx);
    };

    const handleDeletePlane = (idx: number) => {
        const newPlanes = actions.deletePlane(view, planes, idx);
        if (newPlanes) {
            setSliders(newPlanes.map((plane) => -plane.normalOffset[3]));
        }
    };

    const handleToggleOutlines = (idx: number, enabled: boolean) => {
        actions.toggleOutlines(planes, idx, enabled);
    };

    return (
        <>
            {planes.length === sliders.length &&
                planes.map((plane, idx) => {
                    const rgb = vecToRgb(plane.color);
                    rgb.a = 1;
                    const color = rgbToHex(rgb);
                    const outlineEnabled = plane.outline.enabled && outlines;

                    return (
                        <Box mb={2} key={idx} display="flex" alignItems="center" gap={1}>
                            <Box flex="0 0 80px" sx={{ color }}>
                                {t("plane")}
                                {idx + 1}
                            </Box>
                            <Slider
                                min={-plane.baseW - 20}
                                max={-plane.baseW + 20}
                                step={0.1}
                                value={sliders[idx]}
                                onChange={handleSliderChange(idx)}
                                onChangeCommitted={handleSliderChangeCommitted}
                                sx={{ flex: "auto" }}
                            />
                            <Box position="relative">
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={outlineEnabled}
                                    disabled={!outlines}
                                    onChange={() => handleToggleOutlines(idx, !plane.outline.enabled)}
                                />
                                <Typography
                                    sx={{
                                        position: "absolute",
                                        top: -7,
                                        left: 0,
                                        fontSize: "small",
                                        color: "grey",
                                        width: "100%",
                                        textAlign: "center",
                                    }}
                                >
                                    Outline
                                </Typography>
                            </Box>
                            <IconButton onClick={() => handleCameraSwap(idx)} sx={{ flex: 1 }}>
                                <Cameraswitch />
                            </IconButton>
                            <IconButton onClick={() => handleDeletePlane(idx)} sx={{ flex: 1 }}>
                                <Delete />
                            </IconButton>
                        </Box>
                    );
                })}
        </>
    );
}
