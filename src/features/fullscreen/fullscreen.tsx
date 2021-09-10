import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components/speedDialAction";
import { config as featuresConfig } from "config/features";
import { explorerActions } from "slices/explorerSlice";
import { useAppDispatch } from "app/store";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function Fullscreen({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["fullscreen"];

    const dispatch = useAppDispatch();
    const handleClick = () => dispatch(explorerActions.toggleFullscreen());

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="fullscreen"
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
