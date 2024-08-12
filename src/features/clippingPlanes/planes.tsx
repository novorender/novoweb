import { Cameraswitch, Delete } from "@mui/icons-material";
import { Box, IconButton, Slider } from "@mui/material";
import { SyntheticEvent, useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectClippingPlanes } from "features/render";
import { rgbToHex, vecToRgb } from "utils/color";

import { MovingPlaneControl, useClippingPlaneActions } from "./useClippingPlaneActions";

export default function Planes() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const [sliders, setSliders] = useState([] as number[]);
    const { planes } = useAppSelector(selectClippingPlanes);
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

    return (
        <>
            {planes.length === sliders.length &&
                planes.map((plane, idx) => {
                    const rgb = vecToRgb(plane.color);
                    rgb.a = 1;
                    const color = rgbToHex(rgb);

                    return (
                        <Box mb={2} key={idx} display="flex" alignItems="center" gap={1}>
                            <Box flex="0 0 80px" sx={{ color }}>
                                Plane {idx + 1}
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
