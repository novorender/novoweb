import { IconButton, type SpeedDialActionProps } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectSavedCameraPositions, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
    newDesign?: boolean;
};

export function StepBack({ position, newDesign, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["stepBack"];
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const viewMode = useAppSelector(selectViewMode);
    const canStepBack = savedCameraPositions.currentIndex >= 1 && viewMode !== ViewMode.Panorama;

    const dispatch = useAppDispatch();

    const handleClick = () => {
        const step = savedCameraPositions.positions[savedCameraPositions.currentIndex - 1];

        if (!step) {
            return;
        }

        dispatch(renderActions.undoCameraPosition());
    };

    const disabled = !canStepBack;

    if (newDesign) {
        return (
            <IconButton disabled={disabled} onClick={handleClick} title={name}>
                <Icon />
            </IconButton>
        );
    }

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="step-back"
            FabProps={{
                disabled,
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={disabled ? undefined : name}
            icon={<Icon />}
        />
    );
}
