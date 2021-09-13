import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { selectRenderType, renderActions, RenderType } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

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

    if (renderType === RenderType.UnChangeable) {
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
