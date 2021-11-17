import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { selectSavedCameraPositions, renderActions } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function StepForwards({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["stepForwards"];
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const canStepForwards = savedCameraPositions.currentIndex < savedCameraPositions.positions.length - 1;
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();

    const handleClick = () => {
        const step = savedCameraPositions.positions[savedCameraPositions.currentIndex + 1];

        if (!step) {
            return;
        }

        dispatch(renderActions.redoCameraPosition());
        view.camera.controller.moveTo(step.position, step.rotation);
    };

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="step-forwards"
            FabProps={{
                disabled: !canStepForwards,
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
