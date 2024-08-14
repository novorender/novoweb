import { Box, IconButton, type SpeedDialActionProps, Tooltip } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { CameraSpeedLevel, renderActions, selectCurrentCameraSpeedLevel } from "features/render";
import RunIcon from "media/icons/run.svg?react";
import SprintIcon from "media/icons/sprint.svg?react";
import WalkIcon from "media/icons/walk.svg?react";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
    newDesign?: boolean;
};

export function CameraSpeed({ position, newDesign, ...speedDialProps }: Props) {
    const { name } = featuresConfig["cameraSpeed"];
    const level = useAppSelector(selectCurrentCameraSpeedLevel);

    const dispatch = useAppDispatch();

    const handleClick = () => dispatch(renderActions.toggleCameraSpeed());

    const speed = level === CameraSpeedLevel.Slow ? "Slow" : level === CameraSpeedLevel.Default ? "Default" : "Fast";

    const Icon = level === CameraSpeedLevel.Slow ? WalkIcon : level === CameraSpeedLevel.Default ? RunIcon : SprintIcon;

    if (newDesign) {
        return (
            <Tooltip title={`${name} - ${speed}`} placement="top">
                <Box>
                    <IconButton onClick={handleClick}>
                        <Icon />
                    </IconButton>
                </Box>
            </Tooltip>
        );
    }

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
