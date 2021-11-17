import type { SpeedDialActionProps } from "@mui/material";
import { quat, vec3 } from "gl-matrix";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { useAppSelector } from "app/store";
import { selectHomeCameraPosition } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function Home({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["home"];
    const homeCamera = useAppSelector(selectHomeCameraPosition);
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const handleClick = () => {
        if (
            !homeCamera ||
            (vec3.equals(homeCamera.position, view.camera.position) &&
                quat.equals(homeCamera.rotation, view.camera.rotation))
        ) {
            return;
        }

        view.camera.controller.moveTo(homeCamera.position, homeCamera.rotation);
    };

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="home"
            FabProps={{
                disabled: homeCamera === undefined,
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
