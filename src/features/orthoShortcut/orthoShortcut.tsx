import type { SpeedDialActionProps } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getTopDownParams, selectDefaultTopDownElevation } from "features/orthoCam";
import { CameraType, renderActions, selectCameraType } from "features/render";

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
            dispatch(
                renderActions.setCamera({ type: CameraType.Orthographic, goTo: getTopDownParams({ view, elevation }) })
            );
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
