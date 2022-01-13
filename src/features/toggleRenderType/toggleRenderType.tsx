import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectRenderType, renderActions, RenderType } from "slices/renderSlice";

export function ToggleRenderType(speedDialProps: SpeedDialActionProps) {
    const { name, Icon } = featuresConfig["toggleRenderType"];
    const renderType = useAppSelector(selectRenderType);

    const dispatch = useAppDispatch();

    const handleClick = () =>
        dispatch(
            renderActions.setRenderType(
                renderType === RenderType.Triangles
                    ? RenderType.Points
                    : renderType === RenderType.Points
                    ? RenderType.All
                    : RenderType.Triangles
            )
        );

    if (Array.isArray(renderType) && renderType[0] === RenderType.UnChangeable) {
        return null;
    }

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="toggle-render-type"
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
