import type { View } from "@novorender/webgl-api";
import { useToggle } from "hooks/useToggle";
import { useTheme, useMediaQuery, FabProps } from "@material-ui/core";
import { CloseReason, OpenReason, SpeedDial, SpeedDialIcon } from "@material-ui/lab";

import AddIcon from "@material-ui/icons/Add";
import CloseIcon from "@material-ui/icons/Close";

import { CameraSpeed } from "features/cameraSpeed";
import { StepBack } from "features/stepBack";
import { StepForwards } from "features/stepForwards";
import { Home } from "features/home";
import { Fullscreen } from "features/fullscreen";

type Props = {
    view: View;
};

export function CameraNavigationMenu({ view }: Props) {
    const [open, toggle] = useToggle(true);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const handleToggle = (reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggle();
    };

    return (
        <SpeedDial
            open={open}
            onOpen={(_event, reason) => handleToggle(reason)}
            onClose={(_event, reason) => handleToggle(reason)}
            ariaLabel="canvas navigation"
            FabProps={
                {
                    color: "secondary",
                    size: isSmall ? "small" : "large",
                    "data-test": "canvas-navigation-menu-fab",
                } as Partial<FabProps<"button", { "data-test": string }>>
            }
            icon={<SpeedDialIcon open={false} icon={<AddIcon />} openIcon={<CloseIcon />} />}
            style={{ position: "relative" }}
        >
            <Home view={view} position={{ bottom: 0, left: -75 }} />
            <CameraSpeed position={{ bottom: 49, left: -52 }} />
            <Fullscreen position={{ bottom: 72, left: 0 }} />
            <StepBack position={{ bottom: 49, right: -52 }} view={view} />
            <StepForwards position={{ bottom: 0, right: -75 }} view={view} />
        </SpeedDial>
    );
}
