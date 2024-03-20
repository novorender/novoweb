import type { SpeedDialActionProps } from "@mui/material";
import { vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getTopDownParams, selectDefaultTopDownElevation, selectTopDownSnapToAxis } from "features/orthoCam";
import { getSnapToPlaneParams } from "features/orthoCam/utils";
import { CameraType, renderActions, selectCameraType, selectClippingPlanes } from "features/render";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function OrthoShortcut({ position, ...speedDialProps }: Props) {
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
                dispatch(renderActions.setBackground({ color: [0, 0, 0, 1] }));
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
