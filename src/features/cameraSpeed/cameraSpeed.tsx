import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { selectCameraSpeedMultiplier, renderActions, CameraSpeedMultiplier } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

import { ReactComponent as WalkIcon } from "media/icons/walk.svg";
import { ReactComponent as RunIcon } from "media/icons/run.svg";
import { ReactComponent as SprintIcon } from "media/icons/sprint.svg";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function CameraSpeed({ position, ...speedDialProps }: Props) {
    const { name } = featuresConfig["cameraSpeed"];
    const multiplier = useAppSelector(selectCameraSpeedMultiplier);

    const dispatch = useAppDispatch();

    const handleClick = () => dispatch(renderActions.toggleCameraSpeed());

    const speed =
        multiplier === CameraSpeedMultiplier.Slow
            ? "Slow"
            : multiplier === CameraSpeedMultiplier.Normal
            ? "Normal"
            : "Fast";

    const Icon =
        multiplier === CameraSpeedMultiplier.Slow
            ? WalkIcon
            : multiplier === CameraSpeedMultiplier.Normal
            ? RunIcon
            : SprintIcon;

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="camera-speed"
            FabProps={{ ...speedDialProps.FabProps, style: { ...position, position: "absolute" } }}
            onClick={handleClick}
            title={`${name} - ${speed}`}
            icon={<Icon />}
        />
    );
}
