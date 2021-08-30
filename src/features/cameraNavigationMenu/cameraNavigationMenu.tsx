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

    const pos = isSmall ? positions.small : positions.large;

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
            <Home view={view} position={pos[0]} />
            <CameraSpeed position={pos[1]} />
            <Fullscreen position={pos[2]} />
            <StepBack position={pos[3]} view={view} />
            <StepForwards position={pos[4]} view={view} />
        </SpeedDial>
    );
}

const positions = {
    small: [
        {
            bottom: 0,
            left: -64,
        },
        {
            bottom: 42,
            left: -50,
        },
        {
            bottom: 56,
            left: -8,
        },
        {
            bottom: 42,
            right: -50,
        },
        {
            bottom: 0,
            right: -64,
        },
    ],
    large: [
        {
            bottom: 0,
            left: -75,
        },
        {
            bottom: 49,
            left: -52,
        },
        {
            bottom: 72,
            left: 0,
        },
        {
            bottom: 49,
            right: -52,
        },
        {
            bottom: 0,
            right: -75,
        },
    ],
};
