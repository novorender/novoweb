import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AdvancedSetting, CameraType, renderActions, selectCameraType } from "slices/renderSlice";
import { getTopDownParams } from "features/orthoCam";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function OrthoShortcut({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["orthoShortcut"];
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);

    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    const handleClick = () => {
        if (cameraType === CameraType.Flight) {
            const params = getTopDownParams({ view, canvas });

            dispatch(renderActions.setAdvancedSettings({ [AdvancedSetting.TerrainAsBackground]: true }));
            view.settings.terrain.asBackground = true;
            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    params,
                })
            );
        } else {
            dispatch(renderActions.setCamera({ type: CameraType.Flight }));
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
