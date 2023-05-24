import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import {
    selectSavedCameraPositions,
    renderActions,
    selectCameraType,
    CameraType,
    selectViewMode,
} from "features/render/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ViewMode } from "types/misc";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function StepForwards({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["stepForwards"];
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const viewMode = useAppSelector(selectViewMode);
    const cameraType = useAppSelector(selectCameraType);
    const canStepForwards =
        savedCameraPositions.currentIndex < savedCameraPositions.positions.length - 1 &&
        viewMode !== ViewMode.Panorama &&
        cameraType === CameraType.Flight;
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

    const disabled = !canStepForwards;
    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="step-forwards"
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
