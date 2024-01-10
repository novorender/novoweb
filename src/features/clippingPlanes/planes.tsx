import { Cameraswitch } from "@mui/icons-material";
import { Box, Button, Slider } from "@mui/material";
import { ReadonlyQuat, ReadonlyVec3, vec3, vec4 } from "gl-matrix";
import { SyntheticEvent, useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getSnapToPlaneParams } from "features/orthoCam/utils";
import { CameraType, renderActions, selectCameraType, selectClippingPlanes } from "features/render";

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

    const camPos = useRef<ReadonlyVec3 | undefined>(undefined);
    const camRot = useRef<ReadonlyQuat | undefined>(undefined);

    const moveCameraToPlane = (diff: number) => {
        if (camRot.current && camPos.current) {
            const pos = vec3.clone(camPos.current);
            const dir = vec3.fromValues(0, 0, 1);
            vec3.transformQuat(dir, dir, camRot.current);
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
        }
    };

    const handleSliderChange = (idx: number) => (_event: Event, newValue: number | number[]) => {
        const selected = planes[idx];

        if (!selected) {
            return;
        }

        if (camRot.current === undefined) {
            camPos.current = view.renderState.camera.position;
            camRot.current = view.renderState.camera.rotation;
        }

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        setSliders((_state) => {
            const state = [..._state];
            state[idx] = newVal;
            return state;
        });

        const plane = vec4.clone(selected.normalOffset);
        const diff = -newVal - plane[3];
        plane[3] = -newVal;
        view.modifyRenderState({
            clipping: {
                planes: planes.map((p, i) =>
                    i === idx ? { ...selected, outline: { enabled: false }, normalOffset: plane } : p
                ),
            },
        });
        if (cameraType === CameraType.Orthographic) {
            dispatch(renderActions.setClippingInEdit(true));
            moveCameraToPlane(diff);
        }
    };

    const handleSliderChangeCommitted =
        (idx: number) => (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
            const selected = planes[idx];

            camRot.current = undefined;
            camPos.current = undefined;
            if (!selected) {
                return;
            }

            const plane = vec4.clone(selected.normalOffset);
            const newVal = typeof newValue === "number" ? newValue : newValue[0];
            plane[3] = -newVal;
            view.modifyRenderState({
                outlines: { on: true },
            });
            dispatch(
                renderActions.setClippingPlanes({
                    planes: planes.map((p, i) =>
                        i === idx ? { ...selected, outline: { enabled: i === 0 }, normalOffset: plane } : p
                    ),
                })
            );
            if (cameraType === CameraType.Orthographic) {
                dispatch(renderActions.setClippingInEdit(false));
            }
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
