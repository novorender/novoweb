import { IconButton, type SpeedDialActionProps } from "@mui/material";
import { vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getTopDownParams, selectDefaultTopDownElevation, selectTopDownSnapToAxis } from "features/orthoCam";
import { getSnapToPlaneParams } from "features/orthoCam/utils";
import { CameraType, renderActions, selectCameraType, selectClippingPlanes } from "features/render";
import TwoDIcon from "media/icons/2d.svg?react";
import ThreeDIcon from "media/icons/3d.svg?react";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
    newDesign?: boolean;
};

export function OrthoShortcut({ position, newDesign, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["orthoShortcut"];
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const cameraType = useAppSelector(selectCameraType);
    const elevation = useAppSelector(selectDefaultTopDownElevation);
    const snapToNearestAxis = useAppSelector(selectTopDownSnapToAxis) === undefined;
    const dispatch = useAppDispatch();
    const { planes } = useAppSelector(selectClippingPlanes);

    const handleClick = () => {
        if (cameraType === CameraType.Pinhole) {
            if (planes.length > 0) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: getSnapToPlaneParams({ planeIdx: 0, view }),
                    })
                );
            } else {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: getTopDownParams({ view, elevation, snapToNearestAxis }),
                    })
                );
                dispatch(renderActions.setTerrain({ asBackground: true }));
            }
        } else {
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
                            position: vec3.scaleAndAdd(
                                vec3.create(),
                                view.renderState.camera.position,
                                planeDir,
                                view.renderState.camera.fov
                            ),
                            rotation: view.renderState.camera.rotation,
                        },
                    })
                );
            } else {
                dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
            }
        }
    };

    if (newDesign) {
        return (
            <IconButton onClick={handleClick} title={name}>
                {cameraType === CameraType.Orthographic ? <ThreeDIcon /> : <TwoDIcon />}
            </IconButton>
        );
    }

    return (
        <SpeedDialAction
            {...speedDialProps}
            FabProps={{
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            active={cameraType === CameraType.Orthographic}
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
