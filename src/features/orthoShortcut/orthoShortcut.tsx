import type { SpeedDialActionProps } from "@mui/material";
import { vec3 } from "gl-matrix";
import { rotationFromDirection } from "@novorender/web_app";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions, selectCameraType } from "features/render";
import { selectDefaultTopDownElevation } from "features/orthoCam";

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
    const dispatch = useAppDispatch();

    const handleClick = () => {
        if (cameraType === CameraType.Pinhole) {
            const currentPos = vec3.clone(view.renderState.camera.position);

            // Todo guess FOV ?

            const goTo = {
                position:
                    elevation === undefined ? currentPos : vec3.fromValues(currentPos[0], currentPos[1], elevation),
                rotation: rotationFromDirection([0, 0, 1]),
            };
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic, goTo }));
            dispatch(renderActions.setTerrain({ asBackground: true }));
        } else {
            dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
        }
    };

    return (
        <SpeedDialAction
            {...speedDialProps}
            FabProps={{
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
