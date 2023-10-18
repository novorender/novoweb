import { Box, Button, Slider } from "@mui/material";
import { SyntheticEvent, useEffect, useState } from "react";

import { CameraType, renderActions, selectCameraType, selectClippingPlanes } from "features/render";
import { useAppDispatch, useAppSelector } from "app/store";
import { vec3, vec4 } from "gl-matrix";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { Cameraswitch } from "@mui/icons-material";
import { getSnapToPlaneParams } from "features/orthoCam/utils";

export default function Planes() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const [sliders, setSliders] = useState([] as number[]);
    const { planes } = useAppSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);

    useEffect(() => {
        if (planes.length) {
            setSliders(planes.map((plane) => -plane.normalOffset[3]));
        }
    }, [planes]);

    const moveCameraToPlane = (diff: number) => {
        const pos = vec3.clone(view.renderState.camera.position);
        const dir = vec3.fromValues(0, 0, 1);
        vec3.transformQuat(dir, dir, view.renderState.camera.rotation);
        vec3.scaleAndAdd(pos, pos, dir, diff);
        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                goTo: {
                    position: pos,
                    rotation: view.renderState.camera.rotation,
                    far: view.renderState.camera.far,
                },
            })
        );
        dispatch(renderActions.setBackground({ color: [0, 0, 0, 1] }));
    };

    const handleSliderChange = (idx: number) => (_event: Event, newValue: number | number[]) => {
        const selected = planes[idx];

        if (!selected) {
            return;
        }

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        setSliders((_state) => {
            const state = [..._state];
            state[idx] = newVal;
            return state;
        });

        if (cameraType === CameraType.Orthographic) {
            return;
        }
        const plane = vec4.clone(selected.normalOffset);
        plane[3] = -newVal;
        view.modifyRenderState({
            clipping: { planes: planes.map((p, i) => (i === idx ? { ...selected, normalOffset: plane } : p)) },
        });
    };

    const handleSliderChangeCommitted =
        (idx: number) => (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
            const selected = planes[idx];

            if (!selected) {
                return;
            }

            const plane = vec4.clone(selected.normalOffset);
            const newVal = typeof newValue === "number" ? newValue : newValue[0];
            const diff = -newVal - plane[3];
            plane[3] = -newVal;
            if (cameraType === CameraType.Orthographic) {
                moveCameraToPlane(diff);
            }
            dispatch(
                renderActions.setClippingPlanes({
                    planes: planes.map((p, i) => (i === idx ? { ...selected, normalOffset: plane } : p)),
                })
            );
        };

    const handleSnapToPlane = (idx: number) => {
        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                goTo: getSnapToPlaneParams({ planeIdx: idx, view }),
            })
        );
        dispatch(renderActions.setBackground({ color: [0, 0, 0, 1] }));
    };

    const handleCameraSwap = (idx: number) => {
        if (view.renderState.camera.kind === "orthographic") {
            if (planes.length > 0) {
                const planeDir = vec3.fromValues(
                    planes[0].normalOffset[0],
                    planes[0].normalOffset[1],
                    planes[0].normalOffset[2]
                );
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Pinhole,
                        goTo: {
                            position: vec3.scaleAndAdd(vec3.create(), view.renderState.camera.position, planeDir, 15),
                            rotation: view.renderState.camera.rotation,
                        },
                    })
                );
            } else {
                dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
            }
        } else {
            handleSnapToPlane(idx);
        }
    };

    return (
        <>
            {planes.length === sliders.length &&
                planes.map((plane, idx) => {
                    return (
                        <Box mb={2} key={idx}>
                            Plane {idx + 1}:
                            <Slider
                                min={-plane.baseW - 20}
                                max={-plane.baseW + 20}
                                step={0.1}
                                value={sliders[idx]}
                                onChange={handleSliderChange(idx)}
                                onChangeCommitted={handleSliderChangeCommitted(idx)}
                            />
                            <Button onClick={() => handleCameraSwap(idx)} color="grey">
                                <Cameraswitch sx={{ mr: 1 }} />
                            </Button>
                        </Box>
                    );
                })}
        </>
    );
}
