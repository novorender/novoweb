import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { selectSavedCameraPositions, renderActions } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function StepBack({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["stepBack"];
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const canStepBack = savedCameraPositions.currentIndex >= 1;
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();

    const handleClick = () => {
        const step = savedCameraPositions.positions[savedCameraPositions.currentIndex - 1];

        if (!step) {
            return;
        }

        dispatch(renderActions.undoCameraPosition());
        view.camera.controller.moveTo(step.position, step.rotation);
    };

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="step-back"
            FabProps={{
                disabled: !canStepBack,
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
