import { Box, Slider, Typography } from "@mui/material";
import { SyntheticEvent, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions, selectCameraDefaults, selectCameraType, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";

enum SliderKind {
    PinholeFar,
    PinholeNear,
    OrthoFar,
}

export function Clipping() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const cameraDefaults = useAppSelector(selectCameraDefaults);
    const cameraType = useAppSelector(selectCameraType);
    const viewMode = useAppSelector(selectViewMode);
    const dispatch = useAppDispatch();

    const [pinholeFar, setPinholeFar] = useState(() => {
        const d = cameraDefaults.pinhole.clipping.far.toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });

    const [pinholeNear, setPinholeNear] = useState(() => {
        const d = (cameraDefaults.pinhole.clipping.near * 10000).toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });

    const [orthoFar, setOrthoFar] = useState(() => {
        const d = cameraDefaults.orthographic.clipping.far.toString();
        const numZero = Math.max(0, d.length - 2);
        return numZero * 90 + +d.substr(0, d.length - numZero) - 10;
    });

    const handleSliderChange =
        (kind: SliderKind) =>
        (_event: Event, value: number | number[]): void => {
            if (Array.isArray(value) || viewMode !== ViewMode.Default) {
                return;
            }

            switch (kind) {
                case SliderKind.PinholeNear:
                    if (view.renderState.camera.kind !== "pinhole") {
                        return;
                    }

                    setPinholeNear(value);
                    view.modifyRenderState({ camera: { near: scaleNearClipping(value) } });
                    return;
                case SliderKind.PinholeFar:
                    if (view.renderState.camera.kind !== "pinhole") {
                        return;
                    }

                    setPinholeFar(value);
                    view.modifyRenderState({ camera: { far: scaleFarClipping(value) } });
                    return;
                case SliderKind.OrthoFar:
                    if (view.renderState.camera.kind !== "orthographic") {
                        return;
                    }
                    setOrthoFar(value);
                    view.modifyRenderState({ camera: { far: scaleFarClipping(value) } });
                    return;
            }
        };

    const handleSliderCommit =
        (kind: SliderKind) => (_event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
            if (Array.isArray(value) || viewMode !== ViewMode.Default) {
                return;
            }

            switch (kind) {
                case SliderKind.PinholeNear:
                    dispatch(
                        renderActions.setCameraDefaults({
                            pinhole: {
                                clipping: {
                                    near: scaleNearClipping(value),
                                },
                            },
                        })
                    );
                    return;
                case SliderKind.PinholeFar:
                    dispatch(
                        renderActions.setCameraDefaults({
                            pinhole: {
                                clipping: {
                                    far: scaleFarClipping(value),
                                },
                            },
                        })
                    );
                    return;
                case SliderKind.OrthoFar:
                    dispatch(
                        renderActions.setCameraDefaults({
                            orthographic: {
                                clipping: {
                                    far: scaleFarClipping(value),
                                },
                            },
                        })
                    );
            }
        };

    return (
        <>
            <Accordion>
                <AccordionSummary>Clipping (3D)</AccordionSummary>
                <AccordionDetails>
                    <Box p={1} display="flex" flexDirection="column">
                        <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                            <Typography
                                sx={{
                                    width: 160,
                                    flexShrink: 0,
                                }}
                            >
                                Near clipping
                            </Typography>
                            <Slider
                                sx={{ mx: 2, flex: "1 1 100%" }}
                                min={0}
                                max={360}
                                step={1}
                                disabled={cameraType !== CameraType.Pinhole || viewMode !== ViewMode.Default}
                                scale={scaleNearClipping}
                                value={pinholeNear}
                                valueLabelFormat={(value) => value.toFixed(3)}
                                valueLabelDisplay="auto"
                                onChange={handleSliderChange(SliderKind.PinholeNear)}
                                onChangeCommitted={handleSliderCommit(SliderKind.PinholeNear)}
                            />
                        </Box>
                        <Box display="flex" alignItems="center">
                            <Typography
                                sx={{
                                    width: 160,
                                    flexShrink: 0,
                                }}
                            >
                                Far clipping
                            </Typography>
                            <Slider
                                sx={{ mx: 2, flex: "1 1 100%" }}
                                min={180}
                                max={400}
                                step={1}
                                disabled={cameraType !== CameraType.Pinhole || viewMode !== ViewMode.Default}
                                scale={scaleFarClipping}
                                value={pinholeFar}
                                valueLabelFormat={(value) => value.toFixed(0)}
                                valueLabelDisplay="auto"
                                onChange={handleSliderChange(SliderKind.PinholeFar)}
                                onChangeCommitted={handleSliderCommit(SliderKind.PinholeFar)}
                            />
                        </Box>
                    </Box>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary>Clipping (2D)</AccordionSummary>
                <AccordionDetails>
                    <Box p={1} display="flex" alignItems="center">
                        <Typography
                            sx={{
                                width: 160,
                                flexShrink: 0,
                            }}
                        >
                            Far clipping
                        </Typography>
                        <Slider
                            sx={{ mx: 2, flex: "1 1 100%" }}
                            min={180}
                            max={400}
                            step={1}
                            disabled={cameraType !== CameraType.Orthographic || viewMode !== ViewMode.Default}
                            scale={scaleFarClipping}
                            value={orthoFar}
                            valueLabelFormat={(value) => value.toFixed(0)}
                            valueLabelDisplay="auto"
                            onChange={handleSliderChange(SliderKind.OrthoFar)}
                            onChangeCommitted={handleSliderCommit(SliderKind.OrthoFar)}
                        />
                    </Box>
                </AccordionDetails>
            </Accordion>
        </>
    );
}

function scaleNearClipping(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10) * 0.0001;
}

function scaleFarClipping(value: number): number {
    return Math.pow(10, Math.floor(value / 90)) * ((value % 90) + 10);
}
