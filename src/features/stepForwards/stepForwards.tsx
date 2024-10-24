import { Box, IconButton, type SpeedDialActionProps, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectSavedCameraPositions, selectViewMode } from "features/render";
import { ViewMode } from "types/misc";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
    newDesign?: boolean;
};

export function StepForwards({ position, newDesign, ...speedDialProps }: Props) {
    const { t } = useTranslation();
    const { nameKey, Icon } = featuresConfig["stepForwards"];
    const savedCameraPositions = useAppSelector(selectSavedCameraPositions);
    const viewMode = useAppSelector(selectViewMode);
    const canStepForwards =
        savedCameraPositions.currentIndex < savedCameraPositions.positions.length - 1 && viewMode !== ViewMode.Panorama;
    const dispatch = useAppDispatch();

    const handleClick = () => {
        const step = savedCameraPositions.positions[savedCameraPositions.currentIndex + 1];

        if (!step) {
            return;
        }

        dispatch(renderActions.redoCameraPosition());
    };

    const disabled = !canStepForwards;

    if (newDesign) {
        return (
            <Tooltip title={t(nameKey)} placement="top">
                <Box>
                    <IconButton onClick={handleClick} disabled={disabled}>
                        <Icon />
                    </IconButton>
                </Box>
            </Tooltip>
        );
    }

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
            title={disabled ? undefined : t(nameKey)}
            icon={<Icon />}
        />
    );
}
