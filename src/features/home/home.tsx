import type { SpeedDialActionProps } from "@material-ui/lab";
import type { View } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { useAppSelector } from "app/store";
import { selectHomeCameraPosition } from "slices/renderSlice";

type Props = SpeedDialActionProps & {
    view: View;
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function Home({ view, position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig["home"];
    const homeCamera = useAppSelector(selectHomeCameraPosition);

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
